const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const session = require('express-session');
const Teacher = require('./module/Teacher_register');
const Student = require('./module/student_register');
const ApprovedStudent = require('./module/ApprovedStudent');
const ImportantTopic = require('./module/ImportantTopic');
const Resource = require('./module/Resource');
const Assignment = require('./module/Assignment');


// routing part here 
const app = express();
const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(session({ secret: process.env.SESSION_SECRET || 'change-this-edutrack-session-secret', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 4 } }));

const teacherOnly = (req, res, next) => req.session.teacher ? next() : res.redirect('/teacher_log');
const studentOnly = (req, res, next) => req.session.student ? next() : res.redirect('/student_log');
const clean = v => String(v || '').trim();

app.get('/', (req, res) => res.render('home'));
app.get('/teacher_register', (req, res) => res.render('register_from/teacher_register'));
app.get('/student_register', (req, res) => res.render('register_from/student_register'));
app.get('/teacher_log', (req, res) => res.render('teacher_log'));
app.get('/student_log', (req, res) => res.render('student_log'));

app.get('/about', (req, res) => {
  res.render('about');
});
app.get('/contact', (req, res) => {
  res.render('contact', {
    success: null,
    error: null
  });
});


app.get('/features', (req, res) => {
  res.render('features');
});




// app.get('/about',(req,res)=> res.render('about'))

app.post('/teacher/register', async (req, res) => {
  try {
    const { college, name, teacherId, subject, email, password } = req.body;
    if (![college, name, teacherId, subject, email, password].every(v => clean(v))) return res.status(400).send('Please complete all teacher registration fields.');
    if (String(password).length < 8) return res.status(400).send('Password must be at least 8 characters long.');
    await Teacher.create({ college: clean(college), name: clean(name), teacherId: Number(teacherId), subject: clean(subject), email: clean(email).toLowerCase(), password: await bcrypt.hash(password, 10) });
    res.redirect('/teacher_log');
  } catch (e) { console.error(e); res.status(e.code === 11000 ? 409 : 400).send(e.code === 11000 ? 'Teacher email or ID already exists.' : 'Could not register teacher. Check the server console.'); }
});

// A student can only register after a teacher has approved their roll number.
app.post('/student/register', async (req, res) => {
  try {
    const rollNumber = clean(req.body.rollNumber).toUpperCase();
    const name = clean(req.body.name);
    const email = clean(req.body.email).toLowerCase();
    const password = String(req.body.password || '');
    if (!rollNumber || !name || !email || !password) return res.status(400).send('Enter your name, approved roll number, email and password.');
    if (password.length < 8) return res.status(400).send('Password must be at least 8 characters long.');
    const approval = await ApprovedStudent.findOne({ rollNumber, registered: false });
    if (!approval) return res.status(403).send('This roll number has not been added by a teacher, or it has already been registered. Contact your teacher.');
    const student = await Student.create({ name, rollNumber, branch: approval.branch, year: approval.year, email, password: await bcrypt.hash(password, 10) });
    approval.registered = true;
    await approval.save();
    res.send('Student registration successful. You can now log in. <a href="/student_log">Go to login</a>');
  } catch (e) { console.error(e); res.status(e.code === 11000 ? 409 : 400).send(e.code === 11000 ? 'That email or roll number is already registered.' : 'Could not register student. Check your details.'); }
});

app.post('/teacher/login', async (req, res) => {
  try {
    const teacher = await Teacher.findOne({ email: clean(req.body.email).toLowerCase(), teacherId: Number(req.body.teacherId) });
    if (!teacher || !(await bcrypt.compare(String(req.body.password || ''), teacher.password))) return res.status(401).send('Invalid email, Teacher ID or password.');
    req.session.teacher = { id: teacher._id.toString(), name: teacher.name, teacherId: teacher.teacherId, subject: teacher.subject, college: teacher.college };
    res.redirect('/TeacherDash');
  } catch (e) { console.error(e); res.status(500).send('Unable to log in right now.'); }
});
app.post('/student/login', async (req, res) => {
  try {
    const student = await Student.findOne({ rollNumber: clean(req.body.rollNumber).toUpperCase() });
    if (!student || !(await bcrypt.compare(String(req.body.password || ''), student.password))) return res.status(401).send('Invalid roll number or password.');
    req.session.student = { id: student._id.toString(), name: student.name, rollNumber: student.rollNumber, branch: student.branch, year: student.year };
    res.redirect('/student/dashboard');
  } catch (e) { console.error(e); res.status(500).send('Unable to log in right now.'); }
});

app.get('/TeacherDash', teacherOnly, async (req, res) => {
  try {
    const teacherId = req.session.teacher.id;
    const [topics, students, resources] = await Promise.all([
      ImportantTopic.find({ createdBy: teacherId }).sort({ createdAt: -1 }).lean(),
      ApprovedStudent.find({ addedBy: teacherId }).sort({ createdAt: -1 }).lean(),
      Resource.find({ createdBy: teacherId }).sort({ createdAt: -1 }).lean()
    ]);
    const subjectCount = new Set(topics.map(topic => topic.subject.trim().toLowerCase())).size;
    res.render('dashInterFace/TeacherDash', {
      teacher: req.session.teacher, topics, students, resources, subjectCount,
      approvedCount: students.length,
      registeredCount: students.filter(student => student.registered).length,
      message: req.query.message || '', error: req.query.error || ''
    });
  } catch (e) { console.error(e); res.status(500).send('Could not load teacher dashboard.'); }
});

app.post('/teacher/topics', teacherOnly, async (req, res) => {
  try {
    const { title, subject, description, branch, year } = req.body;
    const requestedPriority = clean(req.body.priority);
    if (![title, subject, branch, year].every(v => clean(v))) return res.status(400).send('Topic, subject, branch and year are required.');
    const priority = ['Normal', 'Medium', 'High'].includes(requestedPriority) ? requestedPriority : 'Normal';
    await ImportantTopic.create({ title: clean(title), subject: clean(subject), description: clean(description), branch: clean(branch), year: clean(year), priority, createdBy: req.session.teacher.id });
    res.redirect('/TeacherDash?message=Topic%20added%20successfully');
  } catch (e) { console.error(e); res.status(500).send('Could not add topic.'); }
});
app.post('/teacher/topics/:id/delete', teacherOnly, async (req, res) => {
  try { await ImportantTopic.findOneAndDelete({ _id: req.params.id, createdBy: req.session.teacher.id }); res.redirect('/TeacherDash?message=Topic%20deleted'); }
  catch (e) { res.status(400).send('Could not delete topic.'); }
});
app.post('/teacher/students', teacherOnly, async (req, res) => {
  try {
    const { name, rollNumber, branch, year } = req.body;
    const record = { name: clean(name), rollNumber: clean(rollNumber).toUpperCase(), branch: clean(branch), year: clean(year), addedBy: req.session.teacher.id };
    if (![record.name, record.rollNumber, record.branch, record.year].every(Boolean)) return res.status(400).send('Name, roll number, branch and year are required.');
    await ApprovedStudent.create(record);
    res.redirect('/TeacherDash?message=Student%20roll%20number%20approved');
  } catch (e) { console.error(e); res.status(e.code === 11000 ? 409 : 400).send(e.code === 11000 ? 'That roll number has already been added.' : 'Could not add student.'); }
});
app.post('/teacher/students/:id/delete', teacherOnly, async (req, res) => {
  try {
    const allowed = await ApprovedStudent.findOne({ _id: req.params.id, addedBy: req.session.teacher.id });
    if (!allowed) return res.status(404).send('Student record not found.');
    await Student.deleteOne({ rollNumber: allowed.rollNumber });
    await ApprovedStudent.deleteOne({ _id: allowed._id });
    res.redirect('/TeacherDash?message=Student%20and%20roll%20approval%20deleted');
  } catch (e) { console.error(e); res.status(400).send('Could not delete student.'); }
});

app.post('/teacher/resources', teacherOnly, async (req, res) => {
  try {
    const { title, subject, url, branch, year } = req.body;
    if (![title, subject, url, branch, year].every(v => clean(v))) return res.status(400).send('Complete all resource fields.');
    let parsed;
    try { parsed = new URL(clean(url)); } catch { return res.status(400).send('Enter a valid resource URL.'); }
    if (!['http:', 'https:'].includes(parsed.protocol)) return res.status(400).send('Resource URL must use http or https.');
    await Resource.create({
      title: clean(title), subject: clean(subject), url: parsed.href,
      branch: clean(branch), year: clean(year), createdBy: req.session.teacher.id
    });
    res.redirect('/TeacherDash?message=Resource%20added%20successfully');
  } catch (e) { console.error(e); res.status(400).send('Could not add resource.'); }
});

app.post('/teacher/resources/:id/delete', teacherOnly, async (req, res) => {
  try {
    await Resource.findOneAndDelete({ _id: req.params.id, createdBy: req.session.teacher.id });
    res.redirect('/TeacherDash?message=Resource%20deleted');
  } catch (e) { res.status(400).send('Could not delete resource.'); }
});

app.get('/student/dashboard', studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(req.session.student.id).lean();
    if (!student) {
      req.session.destroy(() => { });
      return res.redirect('/student_log');
    }
    // Only show topics/resources intended for this student's branch and year.
    const [topics, resources] = await Promise.all([
      ImportantTopic.find({ branch: student.branch, year: student.year }).sort({ createdAt: -1 }).lean(),
      Resource.find({ branch: student.branch, year: student.year }).sort({ createdAt: -1 }).lean()
    ]);
    const subjects = [...new Set(topics.map(topic => topic.subject).filter(Boolean))];
    res.render('dashInterFace/StudentDash', { student, topics, resources, subjects });
  } catch (e) {
    console.error('Student dashboard error:', e);
    res.status(500).send('Could not load student dashboard.');
  }
});
app.post('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));
app.get('/logout', (req, res) => req.session.destroy(() => res.redirect('/')));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/edutrack')
  .then(() => app.listen(port, () => console.log(`MongoDB connected; server running at http://localhost:${port}`)))
  .catch(err => console.error('MongoDB connection failed:', err.message));


// student dash profiles

app.get('/student/profile', studentOnly, async (req, res) => {
  try {
    const student = await Student.findById(
      req.session.student.id
    ).lean();

    if (!student) {
      return res.redirect('/student/login');
    }

    res.render('dashInterFace/StudentProfile', {
      student,
      message: req.query.message || '',
      error: req.query.error || ''
    });
  } catch (err) {
    console.error('Student profile error:', err);
    res.status(500).send('Unable to load student profile.');
  }
});



//Assignment routing 

app.get('/teacher/assignment',teacherOnly,async(req,res)=>{
  try{
    const assignments = await Assignment.find({
      teacher:req.session.teacher.Id

    }).sort({createAt: -1}).lean();

    res.render('/dashInterFace/Assignment',{
      teacher:req.session.teacher,assignments
    })
  }catch{
    Console.error('Could not load assignment :',error);
    res.status(500).send('Unable to load tha assignmnets.')
  }
})



app.post('/assignment', teacherOnly, async (req, res) => {
    try {
        const { title, description, subject, dueDate } = req.body;

        if (![title, description, subject, dueDate]
            .every(value => clean(value))) {
            return res.status(400).send(
                'Please complete all assignment fields.'
            );
        }

        await Assignment.create({
            title: clean(title),
            description: clean(description),
            subject: clean(subject),
            dueDate,
            teacher: req.session.teacher.id
        });

        res.redirect('/teacher/assignments?message=Assignment%20created');
    } catch (error) {
        console.error('Assignment creation failed:', error);
        res.status(500).send('Unable to create assignment.');
    }
});
