CREATE TABLE IF NOT EXISTS students (
    student_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
    subject_id INT PRIMARY KEY AUTO_INCREMENT,
    subject_name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS topics (
    topic_id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    topic_name VARCHAR(100) NOT NULL,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id)
);

CREATE TABLE IF NOT EXISTS questions (
    question_id INT PRIMARY KEY AUTO_INCREMENT,
    topic_id INT NOT NULL,
    question_text TEXT NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'EASY',
    correct_option INT NOT NULL,
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

CREATE TABLE IF NOT EXISTS question_options (
    option_id INT PRIMARY KEY AUTO_INCREMENT,
    question_id INT NOT NULL,
    option_number INT NOT NULL,
    option_text TEXT NOT NULL,
    FOREIGN KEY (question_id) REFERENCES questions(question_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
    quiz_id INT PRIMARY KEY AUTO_INCREMENT,
    subject_id INT NOT NULL,
    topic_id INT NOT NULL,
    quiz_name VARCHAR(150) NOT NULL,
    difficulty VARCHAR(20) DEFAULT 'EASY',
    level INT NOT NULL DEFAULT 1,
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (topic_id) REFERENCES topics(topic_id)
);

CREATE TABLE IF NOT EXISTS quiz_questions (
    quiz_id INT NOT NULL,
    question_id INT NOT NULL,
    PRIMARY KEY (quiz_id, question_id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id),
    FOREIGN KEY (question_id) REFERENCES questions(question_id)
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    attempt_id INT PRIMARY KEY AUTO_INCREMENT,
    student_id INT NOT NULL,
    quiz_id INT NOT NULL,
    score INT NOT NULL,
    total_questions INT NOT NULL,
    attempt_number INT DEFAULT 1,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id)
);

INSERT INTO subjects (subject_name) VALUES
('Database Systems'),
('Java Programming'),
('Web Development'),
('Data Structures'),
('Artificial Intelligence'),
('Statistics'),
('Computer Networks'),
('Operating Systems'),
('Discrete Mathematics'),
('Python Programming'),
('C Programming'),
('Electrical Engineering'),
('Electronics and Communication'),
('Mechanical Engineering'),
('Civil Engineering'),
('Chemical Engineering'),
('Biomedical Engineering'),
('Aerospace Engineering'),
('Environmental Engineering'),
('Robotics Engineering'),
('Engineering Mathematics')
ON DUPLICATE KEY UPDATE subject_name = VALUES(subject_name);

INSERT INTO topics (subject_id, topic_name)
SELECT subject_id, 'SQL' FROM subjects WHERE subject_name = 'Database Systems'
UNION ALL
SELECT subject_id, 'ER Model' FROM subjects WHERE subject_name = 'Database Systems'
UNION ALL
SELECT subject_id, 'Keys' FROM subjects WHERE subject_name = 'Database Systems'
UNION ALL
SELECT subject_id, 'Normalization' FROM subjects WHERE subject_name = 'Database Systems'
UNION ALL
SELECT subject_id, 'Transactions' FROM subjects WHERE subject_name = 'Database Systems'
UNION ALL
SELECT subject_id, 'OOP' FROM subjects WHERE subject_name = 'Java Programming'
UNION ALL
SELECT subject_id, 'Classes and Objects' FROM subjects WHERE subject_name = 'Java Programming'
UNION ALL
SELECT subject_id, 'Inheritance' FROM subjects WHERE subject_name = 'Java Programming'
UNION ALL
SELECT subject_id, 'Polymorphism' FROM subjects WHERE subject_name = 'Java Programming'
UNION ALL
SELECT subject_id, 'Abstraction' FROM subjects WHERE subject_name = 'Java Programming'
UNION ALL
SELECT subject_id, 'HTML' FROM subjects WHERE subject_name = 'Web Development'
UNION ALL
SELECT subject_id, 'CSS' FROM subjects WHERE subject_name = 'Web Development'
UNION ALL
SELECT subject_id, 'JavaScript' FROM subjects WHERE subject_name = 'Web Development'
UNION ALL
SELECT subject_id, 'DOM' FROM subjects WHERE subject_name = 'Web Development'
UNION ALL
SELECT subject_id, 'HTTP' FROM subjects WHERE subject_name = 'Web Development'
UNION ALL
SELECT subject_id, 'Fundamentals' FROM subjects WHERE subject_name = 'Data Structures'
UNION ALL
SELECT subject_id, 'Arrays' FROM subjects WHERE subject_name = 'Data Structures'
UNION ALL
SELECT subject_id, 'Linked Lists' FROM subjects WHERE subject_name = 'Data Structures'
UNION ALL
SELECT subject_id, 'Trees' FROM subjects WHERE subject_name = 'Data Structures'
UNION ALL
SELECT subject_id, 'Graphs' FROM subjects WHERE subject_name = 'Data Structures'
UNION ALL
SELECT subject_id, 'AI Basics' FROM subjects WHERE subject_name = 'Artificial Intelligence'
UNION ALL
SELECT subject_id, 'Machine Learning' FROM subjects WHERE subject_name = 'Artificial Intelligence'
UNION ALL
SELECT subject_id, 'Neural Networks' FROM subjects WHERE subject_name = 'Artificial Intelligence'
UNION ALL
SELECT subject_id, 'Computer Vision' FROM subjects WHERE subject_name = 'Artificial Intelligence'
UNION ALL
SELECT subject_id, 'Natural Language Processing' FROM subjects WHERE subject_name = 'Artificial Intelligence'
UNION ALL
SELECT subject_id, 'Statistics Basics' FROM subjects WHERE subject_name = 'Statistics'
UNION ALL
SELECT subject_id, 'Probability' FROM subjects WHERE subject_name = 'Statistics'
UNION ALL
SELECT subject_id, 'Hypothesis Testing' FROM subjects WHERE subject_name = 'Statistics'
UNION ALL
SELECT subject_id, 'Regression' FROM subjects WHERE subject_name = 'Statistics'
UNION ALL
SELECT subject_id, 'Data Visualization' FROM subjects WHERE subject_name = 'Statistics'
UNION ALL
SELECT subject_id, 'Networking Basics' FROM subjects WHERE subject_name = 'Computer Networks'
UNION ALL
SELECT subject_id, 'TCP/IP' FROM subjects WHERE subject_name = 'Computer Networks'
UNION ALL
SELECT subject_id, 'Routing' FROM subjects WHERE subject_name = 'Computer Networks'
UNION ALL
SELECT subject_id, 'OSI Model' FROM subjects WHERE subject_name = 'Computer Networks'
UNION ALL
SELECT subject_id, 'Security' FROM subjects WHERE subject_name = 'Computer Networks'
UNION ALL
SELECT subject_id, 'OS Basics' FROM subjects WHERE subject_name = 'Operating Systems'
UNION ALL
SELECT subject_id, 'Processes' FROM subjects WHERE subject_name = 'Operating Systems'
UNION ALL
SELECT subject_id, 'Memory Management' FROM subjects WHERE subject_name = 'Operating Systems'
UNION ALL
SELECT subject_id, 'File Systems' FROM subjects WHERE subject_name = 'Operating Systems'
UNION ALL
SELECT subject_id, 'Scheduling' FROM subjects WHERE subject_name = 'Operating Systems'
UNION ALL
SELECT subject_id, 'Mathematics Basics' FROM subjects WHERE subject_name = 'Discrete Mathematics'
UNION ALL
SELECT subject_id, 'Logic' FROM subjects WHERE subject_name = 'Discrete Mathematics'
UNION ALL
SELECT subject_id, 'Sets' FROM subjects WHERE subject_name = 'Discrete Mathematics'
UNION ALL
SELECT subject_id, 'Graphs' FROM subjects WHERE subject_name = 'Discrete Mathematics'
UNION ALL
SELECT subject_id, 'Proofs' FROM subjects WHERE subject_name = 'Discrete Mathematics'
UNION ALL
SELECT subject_id, 'Python Basics' FROM subjects WHERE subject_name = 'Python Programming'
UNION ALL
SELECT subject_id, 'Functions' FROM subjects WHERE subject_name = 'Python Programming'
UNION ALL
SELECT subject_id, 'OOP in Python' FROM subjects WHERE subject_name = 'Python Programming'
UNION ALL
SELECT subject_id, 'Data Structures' FROM subjects WHERE subject_name = 'Python Programming'
UNION ALL
SELECT subject_id, 'Modules' FROM subjects WHERE subject_name = 'Python Programming'
UNION ALL
SELECT subject_id, 'C Basics' FROM subjects WHERE subject_name = 'C Programming'
UNION ALL
SELECT subject_id, 'Pointers' FROM subjects WHERE subject_name = 'C Programming'
UNION ALL
SELECT subject_id, 'Arrays' FROM subjects WHERE subject_name = 'C Programming'
UNION ALL
SELECT subject_id, 'Memory' FROM subjects WHERE subject_name = 'C Programming'
UNION ALL
SELECT subject_id, 'Functions' FROM subjects WHERE subject_name = 'C Programming'
ON DUPLICATE KEY UPDATE topic_name = VALUES(topic_name);

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT topic_id, 'Which SQL statement is used to retrieve data?', 'EASY', 3
FROM topics WHERE subject_id = (SELECT subject_id FROM subjects WHERE subject_name = 'Database Systems') AND topic_name = 'SQL'
ON DUPLICATE KEY UPDATE question_text = VALUES(question_text);

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT topic_id, 'Which Java keyword is used to create a new object?', 'EASY', 3
FROM topics WHERE subject_id = (SELECT subject_id FROM subjects WHERE subject_name = 'Java Programming') AND topic_name = 'OOP'
ON DUPLICATE KEY UPDATE question_text = VALUES(question_text);

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT topic_id, 'Which HTML tag defines a paragraph?', 'EASY', 1
FROM topics WHERE subject_id = (SELECT subject_id FROM subjects WHERE subject_name = 'Web Development') AND topic_name = 'HTML'
ON DUPLICATE KEY UPDATE question_text = VALUES(question_text);

INSERT INTO question_options (question_id, option_number, option_text)
SELECT question_id, 1, 'INSERT' FROM questions WHERE question_text = 'Which SQL statement is used to retrieve data?'
UNION ALL
SELECT question_id, 2, 'UPDATE' FROM questions WHERE question_text = 'Which SQL statement is used to retrieve data?'
UNION ALL
SELECT question_id, 3, 'SELECT' FROM questions WHERE question_text = 'Which SQL statement is used to retrieve data?'
UNION ALL
SELECT question_id, 4, 'DELETE' FROM questions WHERE question_text = 'Which SQL statement is used to retrieve data?';

INSERT INTO question_options (question_id, option_number, option_text)
SELECT question_id, 1, 'class' FROM questions WHERE question_text = 'Which Java keyword is used to create a new object?'
UNION ALL
SELECT question_id, 2, 'return' FROM questions WHERE question_text = 'Which Java keyword is used to create a new object?'
UNION ALL
SELECT question_id, 3, 'new' FROM questions WHERE question_text = 'Which Java keyword is used to create a new object?'
UNION ALL
SELECT question_id, 4, 'static' FROM questions WHERE question_text = 'Which Java keyword is used to create a new object?';

INSERT INTO question_options (question_id, option_number, option_text)
SELECT question_id, 1, '<p>' FROM questions WHERE question_text = 'Which HTML tag defines a paragraph?'
UNION ALL
SELECT question_id, 2, '<title>' FROM questions WHERE question_text = 'Which HTML tag defines a paragraph?'
UNION ALL
SELECT question_id, 3, '<h1>' FROM questions WHERE question_text = 'Which HTML tag defines a paragraph?'
UNION ALL
SELECT question_id, 4, '<div>' FROM questions WHERE question_text = 'Which HTML tag defines a paragraph?';

INSERT INTO quizzes (subject_id, quiz_name, difficulty)
SELECT subject_id, 'Basic Quiz', 'EASY' FROM subjects WHERE subject_name = 'Database Systems'
UNION ALL
SELECT subject_id, 'Advanced Quiz', 'HARD' FROM subjects WHERE subject_name = 'Database Systems';

INSERT INTO quizzes (subject_id, quiz_name, difficulty)
SELECT subject_id, 'Basic Quiz', 'EASY' FROM subjects WHERE subject_name = 'Java Programming'
UNION ALL
SELECT subject_id, 'Advanced Quiz', 'HARD' FROM subjects WHERE subject_name = 'Java Programming';

INSERT INTO quizzes (subject_id, quiz_name, difficulty)
SELECT subject_id, 'Basic Quiz', 'EASY' FROM subjects WHERE subject_name = 'Web Development'
UNION ALL
SELECT subject_id, 'Advanced Quiz', 'HARD' FROM subjects WHERE subject_name = 'Web Development';
