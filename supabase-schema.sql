-- ============================================================
-- COMCAT University - Supabase Database Schema
-- Run this SQL in the Supabase SQL Editor to create all tables
-- ============================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'STUDENT',
  phone TEXT,
  address TEXT,
  avatar TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW(),

  -- Student specific
  "studentId" TEXT UNIQUE,
  department TEXT,
  semester INTEGER,
  "enrollmentYear" INTEGER,
  "dateOfBirth" TIMESTAMP,

  -- Teacher specific
  "teacherId" TEXT UNIQUE,
  designation TEXT,
  qualification TEXT
);

-- Subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  credits INTEGER DEFAULT 3,
  semester INTEGER,
  department TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("studentId", "subjectId")
);

-- Subject Teachers table
CREATE TABLE IF NOT EXISTS subject_teachers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  "teacherId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("subjectId", "teacherId")
);

-- Attendance Records table
CREATE TABLE IF NOT EXISTS attendance_records (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "subjectId" TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  "teacherId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'PRESENT',
  remarks TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  UNIQUE("studentId", "subjectId", date)
);

-- Fees table
CREATE TABLE IF NOT EXISTS fees (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT DEFAULT 'PENDING',
  "paidAmount" DOUBLE PRECISION DEFAULT 0,
  "dueDate" TIMESTAMP,
  "paidDate" TIMESTAMP,
  description TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'GENERAL',
  "authorId" TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "isPublished" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- Contact Messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  "isRead" BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- Admissions table
CREATE TABLE IF NOT EXISTS admissions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  cnic TEXT,
  "dateOfBirth" TEXT,
  gender TEXT DEFAULT 'MALE',
  address TEXT,
  city TEXT,
  program TEXT NOT NULL,
  "previousDegree" TEXT,
  "previousInstitution" TEXT,
  "previousGPA" TEXT,
  status TEXT DEFAULT 'PENDING',
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- ============================================================
-- Indexes for better performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments("studentId");
CREATE INDEX IF NOT EXISTS idx_enrollments_subject ON enrollments("subjectId");
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records("studentId");
CREATE INDEX IF NOT EXISTS idx_attendance_subject ON attendance_records("subjectId");
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(date);
CREATE INDEX IF NOT EXISTS idx_fees_student ON fees("studentId");
CREATE INDEX IF NOT EXISTS idx_fees_status ON fees(status);
CREATE INDEX IF NOT EXISTS idx_announcements_author ON announcements("authorId");
CREATE INDEX IF NOT EXISTS idx_contact_messages_read ON contact_messages("isRead");
CREATE INDEX IF NOT EXISTS idx_admissions_email ON admissions(email);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions(status);
CREATE INDEX IF NOT EXISTS idx_admissions_program ON admissions(program);

-- ============================================================
-- Enable Row Level Security (optional but recommended)
-- Uncomment the lines below if you want RLS enabled
-- ============================================================
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
