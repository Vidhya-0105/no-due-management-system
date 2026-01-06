const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

const JWT_SECRET = 'your-secret-key-change-in-production';
const PORT = 5000;

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/noduesystem', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// ===== Database Models =====

// User Schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff', 'admin'], required: true },
  name: { type: String, required: true },
  rollNo: String,
  course: String,
  year: String,
  department: String,
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Clearance Request Schema
const clearanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, default: 'pending' },
  submittedDate: { type: Date, default: Date.now },
  departments: {
    library: {
      status: { type: String, default: 'pending' },
      comment: String,
      approvedBy: String,
      approvedDate: Date
    },
    hostel: {
      status: { type: String, default: 'pending' },
      comment: String,
      approvedBy: String,
      approvedDate: Date
    },
    accounts: {
      status: { type: String, default: 'pending' },
      comment: String,
      approvedBy: String,
      approvedDate: Date
    },
    lab: {
      status: { type: String, default: 'pending' },
      comment: String,
      approvedBy: String,
      approvedDate: Date
    },
    department: {
      status: { type: String, default: 'pending' },
      comment: String,
      approvedBy: String,
      approvedDate: Date
    },
    placement: {
      status: { type: String, default: 'pending' },
      comment: String,
      approvedBy: String,
      approvedDate: Date
    }
  }
});

const Clearance = mongoose.model('Clearance', clearanceSchema);

// Document Schema
const documentSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  fileName: { type: String, required: true },
  fileType: { type: String, required: true },
  filePath: { type: String, required: true },
  uploadDate: { type: Date, default: Date.now }
});

const Document = mongoose.model('Document', documentSchema);

// ===== Middleware =====
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });
    req.user = user;
    next();
  });
};

// File upload configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// ===== API Routes =====

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, role, name, rollNo, course, year, department } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      role,
      name,
      rollNo,
      course,
      year,
      department
    });

    await user.save();

    // Create clearance request for students
    if (role === 'student') {
      const clearance = new Clearance({ studentId: user._id });
      await clearance.save();
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        name: user.name,
        rollNo: user.rollNo,
        course: user.course,
        year: user.year,
        department: user.department
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get current user's clearance (Student)
app.get('/api/clearances/my-clearance', authenticateToken, async (req, res) => {
  try {
    const clearance = await Clearance.findOne({ studentId: req.user.id });
    res.json(clearance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all students (Admin/Staff)
app.get('/api/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    // support optional pagination
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const skip = (page - 1) * limit;

    const students = await User.find({ role: 'student' })
      .select('-password')
      .skip(skip)
      .limit(limit);
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Add student (Admin/Staff)
app.post('/api/students', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'staff') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { email, password, name, rollNo, course, year } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Student already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const student = new User({
      email,
      password: hashedPassword,
      role: 'student',
      name,
      rollNo,
      course,
      year
    });

    await student.save();

    // Create clearance request
    const clearance = new Clearance({ studentId: student._id });
    await clearance.save();

    res.status(201).json({ message: 'Student added successfully', student });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all clearances (Admin)
app.get('/api/clearances', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const clearances = await Clearance.find().populate('studentId', 'name rollNo course year email');
    res.json(clearances);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get clearance by student ID (Admin/Staff)
app.get('/api/clearances/:studentId', authenticateToken, async (req, res) => {
  try {
    // allow admins/staff or the student themself
    if (req.user.role !== 'admin' && req.user.role !== 'staff' && req.user.id !== req.params.studentId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const clearance = await Clearance.findOne({ studentId: req.params.studentId })
      .populate('studentId', 'name rollNo course year email');
    if (!clearance) return res.status(404).json({ message: 'Clearance not found' });
    res.json(clearance);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update clearance status (Staff)
app.put('/api/clearances/:studentId/:department', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { studentId, department } = req.params;
    const { status, comment } = req.body;

    const user = await User.findById(req.user.id);
    
    const clearance = await Clearance.findOne({ studentId });
    if (!clearance) {
      return res.status(404).json({ message: 'Clearance not found' });
    }

    clearance.departments[department] = {
      status,
      comment,
      approvedBy: user.name,
      approvedDate: new Date()
    };

    // Check if all departments approved
    const allApproved = Object.values(clearance.departments).every(
      dept => dept.status === 'approved'
    );
    if (allApproved) {
      clearance.status = 'completed';
    }

    await clearance.save();
    res.json({ message: 'Clearance updated successfully', clearance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Alias route used by frontend: POST /api/clearances/:studentId/departments/:department
app.post('/api/clearances/:studentId/departments/:department', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'staff' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const { studentId, department } = req.params;
    const { status, comment } = req.body;

    const user = await User.findById(req.user.id);
    const clearance = await Clearance.findOne({ studentId });
    if (!clearance) {
      return res.status(404).json({ message: 'Clearance not found' });
    }

    clearance.departments[department] = {
      status,
      comment,
      approvedBy: user.name,
      approvedDate: new Date()
    };

    const allApproved = Object.values(clearance.departments).every(
      dept => dept.status === 'approved'
    );
    if (allApproved) {
      clearance.status = 'completed';
    }

    await clearance.save();
    res.json({ message: 'Clearance updated successfully', clearance });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Upload document
app.post('/api/documents/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const document = new Document({
      studentId: req.user.id,
      fileName: req.file.originalname,
      fileType: req.body.fileType,
      filePath: req.file.path
    });

    await document.save();
    res.status(201).json({ message: 'Document uploaded successfully', document });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get student documents
app.get('/api/documents/my-documents', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ studentId: req.user.id });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get documents by student ID (Admin/Staff)
app.get('/api/documents/:studentId', authenticateToken, async (req, res) => {
  try {
    const documents = await Document.find({ studentId: req.params.studentId });
    res.json(documents);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete document
app.delete('/api/documents/:id', authenticateToken, async (req, res) => {
  try {
    await Document.findByIdAndDelete(req.params.id);
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Dashboard stats (Admin)
app.get('/api/stats', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const totalStudents = await User.countDocuments({ role: 'student' });
    const completedClearances = await Clearance.countDocuments({ status: 'completed' });
    const pendingClearances = totalStudents - completedClearances;

    res.json({
      totalStudents,
      completedClearances,
      pendingClearances
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
