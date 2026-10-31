USE exam_prep_db;

SET @topic_column_sql = (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE quizzes ADD COLUMN topic_id INT NULL',
        'SELECT 1')
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'quizzes'
      AND column_name = 'topic_id'
);
PREPARE topic_column_statement FROM @topic_column_sql;
EXECUTE topic_column_statement;
DEALLOCATE PREPARE topic_column_statement;

SET @level_column_sql = (
    SELECT IF(COUNT(*) = 0,
        'ALTER TABLE quizzes ADD COLUMN level INT NOT NULL DEFAULT 1',
        'SELECT 1')
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'quizzes'
      AND column_name = 'level'
);
PREPARE level_column_statement FROM @level_column_sql;
EXECUTE level_column_statement;
DEALLOCATE PREPARE level_column_statement;

CREATE TEMPORARY TABLE duplicate_topics AS
SELECT duplicate_topic.topic_id
FROM topics duplicate_topic
JOIN (
    SELECT subject_id, topic_name, MIN(topic_id) AS retained_topic_id
    FROM topics
    GROUP BY subject_id, topic_name
) retained_topic
    ON retained_topic.subject_id = duplicate_topic.subject_id
   AND retained_topic.topic_name = duplicate_topic.topic_name
WHERE duplicate_topic.topic_id <> retained_topic.retained_topic_id;

DELETE qa FROM quiz_attempts qa
JOIN quizzes q ON q.quiz_id = qa.quiz_id
JOIN duplicate_topics d ON d.topic_id = q.topic_id;

DELETE qq FROM quiz_questions qq
JOIN duplicate_topics d ON d.topic_id = (
    SELECT topic_id FROM quizzes q WHERE q.quiz_id = qq.quiz_id
);

DELETE qz FROM quizzes qz
JOIN duplicate_topics d ON d.topic_id = qz.topic_id;

DELETE qo FROM question_options qo
JOIN questions q ON q.question_id = qo.question_id
JOIN duplicate_topics d ON d.topic_id = q.topic_id;

DELETE q FROM questions q
JOIN duplicate_topics d ON d.topic_id = q.topic_id;

DELETE t FROM topics t
JOIN duplicate_topics d ON d.topic_id = t.topic_id;

INSERT IGNORE INTO subjects (subject_name) VALUES
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
('C Programming');

INSERT INTO topics (subject_id, topic_name)
SELECT s.subject_id, CASE s.subject_name
    WHEN 'Database Systems' THEN 'SQL'
    WHEN 'Java Programming' THEN 'OOP'
    WHEN 'Web Development' THEN 'HTML'
    WHEN 'Data Structures' THEN 'Fundamentals'
    WHEN 'Artificial Intelligence' THEN 'AI Basics'
    WHEN 'Statistics' THEN 'Statistics Basics'
    WHEN 'Computer Networks' THEN 'Networking Basics'
    WHEN 'Operating Systems' THEN 'OS Basics'
    WHEN 'Discrete Mathematics' THEN 'Mathematics Basics'
    WHEN 'Python Programming' THEN 'Python Basics'
    WHEN 'C Programming' THEN 'C Basics'
END
FROM subjects s
WHERE s.subject_name IN (
        'Database Systems', 'Java Programming', 'Web Development',
        'Data Structures', 'Artificial Intelligence', 'Statistics',
        'Computer Networks', 'Operating Systems', 'Discrete Mathematics',
        'Python Programming', 'C Programming'
)
    AND NOT EXISTS (
    SELECT 1 FROM topics t
    WHERE t.subject_id = s.subject_id
      AND t.topic_name = CASE s.subject_name
          WHEN 'Database Systems' THEN 'SQL'
          WHEN 'Java Programming' THEN 'OOP'
          WHEN 'Web Development' THEN 'HTML'
          WHEN 'Data Structures' THEN 'Fundamentals'
          WHEN 'Artificial Intelligence' THEN 'AI Basics'
          WHEN 'Statistics' THEN 'Statistics Basics'
          WHEN 'Computer Networks' THEN 'Networking Basics'
          WHEN 'Operating Systems' THEN 'OS Basics'
          WHEN 'Discrete Mathematics' THEN 'Mathematics Basics'
          WHEN 'Python Programming' THEN 'Python Basics'
          WHEN 'C Programming' THEN 'C Basics'
      END
);

    DELETE qa FROM quiz_attempts qa
    JOIN quizzes q ON q.quiz_id = qa.quiz_id
    JOIN subjects s ON s.subject_id = q.subject_id
    WHERE s.subject_name IN (
        'Database Systems', 'Java Programming', 'Web Development',
        'Data Structures', 'Artificial Intelligence', 'Statistics',
        'Computer Networks', 'Operating Systems', 'Discrete Mathematics',
        'Python Programming', 'C Programming'
    );

    DELETE qq FROM quiz_questions qq
    JOIN quizzes q ON q.quiz_id = qq.quiz_id
    JOIN subjects s ON s.subject_id = q.subject_id
    WHERE s.subject_name IN (
        'Database Systems', 'Java Programming', 'Web Development',
        'Data Structures', 'Artificial Intelligence', 'Statistics',
        'Computer Networks', 'Operating Systems', 'Discrete Mathematics',
        'Python Programming', 'C Programming'
    );

    DELETE q FROM quizzes q
    JOIN subjects s ON s.subject_id = q.subject_id
    WHERE s.subject_name IN (
        'Database Systems', 'Java Programming', 'Web Development',
        'Data Structures', 'Artificial Intelligence', 'Statistics',
        'Computer Networks', 'Operating Systems', 'Discrete Mathematics',
        'Python Programming', 'C Programming'
    );

DELETE qo FROM question_options qo
JOIN questions q ON q.question_id = qo.question_id
JOIN topics t ON t.topic_id = q.topic_id
JOIN subjects s ON s.subject_id = t.subject_id
WHERE s.subject_name IN (
    'Database Systems', 'Java Programming', 'Web Development',
    'Data Structures', 'Artificial Intelligence', 'Statistics',
    'Computer Networks', 'Operating Systems', 'Discrete Mathematics',
    'Python Programming', 'C Programming'
);

DELETE q FROM questions q
JOIN topics t ON t.topic_id = q.topic_id
JOIN subjects s ON s.subject_id = t.subject_id
WHERE s.subject_name IN (
    'Database Systems', 'Java Programming', 'Web Development',
    'Data Structures', 'Artificial Intelligence', 'Statistics',
    'Computer Networks', 'Operating Systems', 'Discrete Mathematics',
    'Python Programming', 'C Programming'
);

CREATE TEMPORARY TABLE quiz_seed (
    subject_name VARCHAR(100) NOT NULL,
    topic_name VARCHAR(100) NOT NULL,
    question_text TEXT NOT NULL,
    correct_option INT NOT NULL,
    option_one TEXT NOT NULL,
    option_two TEXT NOT NULL,
    option_three TEXT NOT NULL,
    option_four TEXT NOT NULL
);

INSERT INTO quiz_seed VALUES
('Database Systems', 'SQL', 'Which SQL statement retrieves data?', 3, 'INSERT', 'UPDATE', 'SELECT', 'DELETE'),
('Database Systems', 'SQL', 'Which clause filters grouped rows?', 2, 'WHERE', 'HAVING', 'ORDER BY', 'GROUP BY'),
('Database Systems', 'SQL', 'Which key uniquely identifies a row?', 1, 'Primary key', 'Foreign key', 'Candidate value', 'Index key'),
('Database Systems', 'SQL', 'Which command creates a table?', 4, 'ADD TABLE', 'NEW TABLE', 'MAKE TABLE', 'CREATE TABLE'),
('Database Systems', 'SQL', 'What does normalization reduce?', 2, 'Security', 'Data redundancy', 'Query syntax', 'Network traffic'),
('Database Systems', 'SQL', 'Which join returns matching rows from both tables?', 1, 'INNER JOIN', 'OUTER JOIN', 'CROSS JOIN', 'SELF JOIN'),
('Database Systems', 'SQL', 'Which command changes existing rows?', 3, 'ALTER', 'INSERT', 'UPDATE', 'MODIFY'),
('Java Programming', 'OOP', 'Which Java keyword creates a new object?', 3, 'class', 'return', 'new', 'static'),
('Java Programming', 'OOP', 'Which method starts a Java application?', 1, 'main', 'start', 'run', 'init'),
('Java Programming', 'OOP', 'Which type stores true or false?', 4, 'int', 'char', 'String', 'boolean'),
('Java Programming', 'OOP', 'Which keyword inherits from a class?', 2, 'implements', 'extends', 'inherits', 'superclass'),
('Java Programming', 'OOP', 'Which collection does not allow duplicate values?', 1, 'Set', 'List', 'Queue', 'Map'),
('Java Programming', 'OOP', 'Which block handles an exception?', 3, 'if', 'catcher', 'catch', 'error'),
('Java Programming', 'OOP', 'Which keyword prevents inheritance?', 4, 'static', 'private', 'const', 'final'),
('Web Development', 'HTML', 'Which HTML tag defines a paragraph?', 1, '<p>', '<title>', '<h1>', '<div>'),
('Web Development', 'HTML', 'Which tag creates a hyperlink?', 4, '<link>', '<url>', '<href>', '<a>'),
('Web Development', 'HTML', 'Which CSS property changes text color?', 2, 'font', 'color', 'text-style', 'foreground'),
('Web Development', 'HTML', 'Which language adds behavior to a web page?', 3, 'HTML', 'CSS', 'JavaScript', 'SQL'),
('Web Development', 'HTML', 'Which HTTP method commonly retrieves data?', 1, 'GET', 'SEND', 'FETCH', 'READ'),
('Web Development', 'HTML', 'Which tag displays an image?', 2, '<image>', '<img>', '<picture-src>', '<src>'),
('Web Development', 'HTML', 'Which CSS layout uses rows and columns?', 4, 'Float', 'Block', 'Inline', 'Grid'),
('Data Structures', 'Fundamentals', 'Which structure follows first-in, first-out order?', 1, 'Queue', 'Stack', 'Tree', 'Graph'),
('Data Structures', 'Fundamentals', 'Which structure follows last-in, first-out order?', 2, 'Queue', 'Stack', 'Tree', 'Graph'),
('Data Structures', 'Fundamentals', 'Which structure stores key-value pairs?', 4, 'Array', 'Queue', 'Stack', 'Map'),
('Data Structures', 'Fundamentals', 'Which structure represents hierarchical data?', 3, 'Array', 'Queue', 'Tree', 'Stack'),
('Data Structures', 'Fundamentals', 'Which structure stores elements at indexed positions?', 1, 'Array', 'Graph', 'Tree', 'Queue'),
('Data Structures', 'Fundamentals', 'Which algorithm visits neighboring graph nodes first?', 2, 'DFS', 'BFS', 'Binary search', 'Merge sort'),
('Data Structures', 'Fundamentals', 'Which search requires sorted data?', 4, 'Linear search', 'Depth search', 'Hash search', 'Binary search'),
('Artificial Intelligence', 'AI Basics', 'What does AI stand for?', 1, 'Artificial Intelligence', 'Automated Internet', 'Applied Interaction', 'Algorithmic Input'),
('Artificial Intelligence', 'AI Basics', 'Which approach learns from labeled examples?', 3, 'Clustering', 'Random search', 'Supervised learning', 'Sorting'),
('Artificial Intelligence', 'AI Basics', 'What is a model used to make?', 2, 'Tables', 'Predictions', 'Passwords', 'Backups'),
('Artificial Intelligence', 'AI Basics', 'Which approach groups unlabeled data?', 4, 'Supervised learning', 'Regression', 'Classification', 'Clustering'),
('Artificial Intelligence', 'AI Basics', 'What is a neural network inspired by?', 1, 'The human brain', 'A database', 'A router', 'A compiler'),
('Artificial Intelligence', 'AI Basics', 'What is training data used for?', 3, 'Deleting models', 'Formatting disks', 'Learning patterns', 'Sending emails'),
('Artificial Intelligence', 'AI Basics', 'Which field enables computers to understand text?', 2, 'Computer graphics', 'Natural language processing', 'Operating systems', 'Cryptography'),
('Statistics', 'Statistics Basics', 'Which measure is the average of values?', 1, 'Mean', 'Mode', 'Range', 'Variance'),
('Statistics', 'Statistics Basics', 'Which measure is the middle value?', 3, 'Mean', 'Mode', 'Median', 'Range'),
('Statistics', 'Statistics Basics', 'Which measure describes spread?', 4, 'Mean', 'Median', 'Mode', 'Standard deviation'),
('Statistics', 'Statistics Basics', 'Which value appears most often?', 2, 'Mean', 'Mode', 'Median', 'Range'),
('Statistics', 'Statistics Basics', 'What does a sample represent?', 1, 'Part of a population', 'Every possible value', 'A graph type', 'A formula'),
('Statistics', 'Statistics Basics', 'What does probability measure?', 3, 'Data size', 'Average value', 'Likelihood of an event', 'Table width'),
('Statistics', 'Statistics Basics', 'Which chart is useful for comparing categories?', 4, 'Scatter plot', 'Histogram', 'Line chart', 'Bar chart'),
('Computer Networks', 'Networking Basics', 'What does IP stand for?', 2, 'Internet Process', 'Internet Protocol', 'Internal Port', 'Input Path'),
('Computer Networks', 'Networking Basics', 'Which device forwards packets between networks?', 1, 'Router', 'Monitor', 'Keyboard', 'Printer'),
('Computer Networks', 'Networking Basics', 'Which protocol is used for web pages?', 3, 'FTP', 'SSH', 'HTTP', 'SMTP'),
('Computer Networks', 'Networking Basics', 'Which device connects devices in a local network?', 4, 'Router', 'Modem', 'Repeater', 'Switch'),
('Computer Networks', 'Networking Basics', 'What does DNS translate?', 1, 'Domain names to IP addresses', 'Files to folders', 'Text to images', 'Ports to cables'),
('Computer Networks', 'Networking Basics', 'Which protocol sends email?', 2, 'HTTP', 'SMTP', 'FTP', 'DHCP'),
('Computer Networks', 'Networking Basics', 'What does bandwidth describe?', 3, 'Device weight', 'Cable length', 'Data transfer capacity', 'Password strength'),
('Operating Systems', 'OS Basics', 'Which component manages computer resources?', 4, 'Compiler', 'Browser', 'Database', 'Operating system'),
('Operating Systems', 'OS Basics', 'Which process state means ready to run?', 1, 'Ready', 'Closed', 'Deleted', 'Archived'),
('Operating Systems', 'OS Basics', 'Which memory is temporary?', 2, 'ROM', 'RAM', 'Disk', 'Cloud'),
('Operating Systems', 'OS Basics', 'Which component schedules processes?', 3, 'File', 'Keyboard', 'Operating system', 'Monitor'),
('Operating Systems', 'OS Basics', 'What does a file system organize?', 1, 'Files and directories', 'Network cables', 'Screen pixels', 'Passwords'),
('Operating Systems', 'OS Basics', 'Which software manages hardware?', 4, 'Text editor', 'Web page', 'Spreadsheet', 'Operating system'),
('Operating Systems', 'OS Basics', 'What is multitasking?', 2, 'Deleting tasks', 'Running multiple tasks', 'Formatting memory', 'Installing drivers'),
('Discrete Mathematics', 'Mathematics Basics', 'Which operation is represented by AND?', 1, 'Conjunction', 'Disjunction', 'Negation', 'Implication'),
('Discrete Mathematics', 'Mathematics Basics', 'What is a set with no elements called?', 3, 'Universal set', 'Finite set', 'Empty set', 'Power set'),
('Discrete Mathematics', 'Mathematics Basics', 'Which graph has edges with direction?', 4, 'Simple graph', 'Tree', 'Cycle', 'Directed graph'),
('Discrete Mathematics', 'Mathematics Basics', 'What is a statement that is either true or false?', 2, 'Variable', 'Proposition', 'Function', 'Sequence'),
('Discrete Mathematics', 'Mathematics Basics', 'What is the union of two sets?', 1, 'All elements in either set', 'Only common elements', 'No elements', 'Repeated elements'),
('Discrete Mathematics', 'Mathematics Basics', 'Which relation pairs each input with one output?', 3, 'Set', 'Graph', 'Function', 'Proof'),
('Discrete Mathematics', 'Mathematics Basics', 'What does a proof establish?', 4, 'A guess', 'A data type', 'A network', 'A mathematical result'),
('Python Programming', 'Python Basics', 'Which keyword defines a function?', 2, 'function', 'def', 'fun', 'define'),
('Python Programming', 'Python Basics', 'Which type stores an ordered mutable collection?', 1, 'list', 'tuple', 'set', 'string'),
('Python Programming', 'Python Basics', 'Which symbol starts a comment?', 3, '//', '/*', '#', '--'),
('Python Programming', 'Python Basics', 'Which keyword repeats over items?', 4, 'loop', 'repeat', 'iterate', 'for'),
('Python Programming', 'Python Basics', 'Which type stores key-value pairs?', 2, 'list', 'dict', 'tuple', 'set'),
('Python Programming', 'Python Basics', 'Which function displays output?', 1, 'print', 'show', 'display', 'write'),
('Python Programming', 'Python Basics', 'Which value represents no value?', 3, 'empty', 'zero', 'None', 'nullvalue'),
('C Programming', 'C Basics', 'Which function is the usual program entry point?', 1, 'main', 'start', 'run', 'begin'),
('C Programming', 'C Basics', 'Which symbol ends a C statement?', 4, ':', '.', ',', ';'),
('C Programming', 'C Basics', 'Which type stores whole numbers?', 2, 'float', 'int', 'char', 'double'),
('C Programming', 'C Basics', 'Which symbol accesses a variable address?', 3, '#', '@', '&', '$'),
('C Programming', 'C Basics', 'Which function reads formatted input?', 1, 'scanf', 'input', 'readline', 'getinput'),
('C Programming', 'C Basics', 'Which header provides printf?', 2, 'stdlib.h', 'stdio.h', 'string.h', 'math.h'),
('C Programming', 'C Basics', 'Which loop checks its condition first?', 4, 'do-while', 'repeat', 'until', 'while');

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT t.topic_id, s.question_text, 'EASY', s.correct_option
FROM quiz_seed s
JOIN subjects sub ON sub.subject_name = s.subject_name
JOIN topics t ON t.topic_id = (
    SELECT MIN(t2.topic_id)
    FROM topics t2
    WHERE t2.subject_id = sub.subject_id AND t2.topic_name = s.topic_name
);

INSERT INTO question_options (question_id, option_number, option_text)
SELECT q.question_id, 1, s.option_one
FROM questions q JOIN quiz_seed s ON s.question_text = q.question_text;

INSERT INTO question_options (question_id, option_number, option_text)
SELECT q.question_id, 2, s.option_two
FROM questions q JOIN quiz_seed s ON s.question_text = q.question_text;

INSERT INTO question_options (question_id, option_number, option_text)
SELECT q.question_id, 3, s.option_three
FROM questions q JOIN quiz_seed s ON s.question_text = q.question_text;

INSERT INTO question_options (question_id, option_number, option_text)
SELECT q.question_id, 4, s.option_four
FROM questions q JOIN quiz_seed s ON s.question_text = q.question_text;

CREATE TEMPORARY TABLE cloned_question_map (
    source_question_id INT NOT NULL,
    target_topic_id INT NOT NULL
);

INSERT INTO cloned_question_map (source_question_id, target_topic_id)
SELECT q.question_id, target_topic.topic_id
FROM questions q
JOIN topics source_topic ON source_topic.topic_id = q.topic_id
JOIN topics target_topic ON target_topic.subject_id = source_topic.subject_id
WHERE source_topic.topic_name IN (
    'SQL', 'OOP', 'HTML', 'Fundamentals', 'AI Basics',
    'Statistics Basics', 'Networking Basics', 'OS Basics',
    'Mathematics Basics', 'Python Basics', 'C Basics'
)
  AND target_topic.topic_id <> source_topic.topic_id
  AND NOT EXISTS (
      SELECT 1 FROM questions existing_question
      WHERE existing_question.topic_id = target_topic.topic_id
  );

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT m.target_topic_id, q.question_text, q.difficulty, q.correct_option
FROM cloned_question_map m
JOIN questions q ON q.question_id = m.source_question_id;

INSERT INTO question_options (question_id, option_number, option_text)
SELECT target_question.question_id, source_option.option_number, source_option.option_text
FROM cloned_question_map m
JOIN questions source_question ON source_question.question_id = m.source_question_id
JOIN question_options source_option ON source_option.question_id = source_question.question_id
JOIN questions target_question
    ON target_question.topic_id = m.target_topic_id
   AND target_question.question_text = source_question.question_text;

CREATE TEMPORARY TABLE padding_numbers (number_value INT NOT NULL);
INSERT INTO padding_numbers VALUES (1), (2), (3);

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT topic.topic_id,
             CONCAT(base_question.question_text, ' - Practice variant ', padding.number_value),
             base_question.difficulty,
             base_question.correct_option
FROM topics topic
JOIN (
        SELECT topic_id, MIN(question_id) AS question_id
        FROM questions
        GROUP BY topic_id
) base ON base.topic_id = topic.topic_id
JOIN questions base_question ON base_question.question_id = base.question_id
CROSS JOIN padding_numbers padding
WHERE (SELECT COUNT(*) FROM questions existing_question WHERE existing_question.topic_id = topic.topic_id) < 10
    AND NOT EXISTS (
            SELECT 1
            FROM questions existing_question
            WHERE existing_question.topic_id = topic.topic_id
                AND existing_question.question_text = CONCAT(base_question.question_text, ' - Practice variant ', padding.number_value)
    );

INSERT INTO question_options (question_id, option_number, option_text)
SELECT variant.question_id, source_option.option_number, source_option.option_text
FROM questions variant
JOIN questions source_question
        ON variant.question_text = CONCAT(source_question.question_text, ' - Practice variant ',
                                                                             SUBSTRING_INDEX(variant.question_text, ' - Practice variant ', -1))
JOIN question_options source_option ON source_option.question_id = source_question.question_id
WHERE variant.question_text LIKE '% - Practice variant %'
    AND NOT EXISTS (
            SELECT 1
            FROM question_options existing_option
            WHERE existing_option.question_id = variant.question_id
                AND existing_option.option_number = source_option.option_number
    );

INSERT INTO quizzes (subject_id, topic_id, quiz_name, difficulty, level)
SELECT t.subject_id, t.topic_id,
       CONCAT(t.topic_name, ' - Level ', levels.level),
       levels.difficulty,
       levels.level
FROM topics t
CROSS JOIN (
    SELECT 1 AS level, 'BASIC' AS difficulty
    UNION ALL SELECT 2, 'EASY'
    UNION ALL SELECT 3, 'INTERMEDIATE'
    UNION ALL SELECT 4, 'ADVANCED'
    UNION ALL SELECT 5, 'EXPERT'
) levels;

INSERT IGNORE INTO topics (subject_id, topic_name)
SELECT subject.subject_id, topic_names.topic_name
FROM subjects subject
CROSS JOIN (
    SELECT 'Fundamentals' AS topic_name
    UNION ALL SELECT 'Core Concepts'
    UNION ALL SELECT 'Applications'
    UNION ALL SELECT 'Problem Solving'
    UNION ALL SELECT 'Advanced Basics'
) topic_names
WHERE subject.subject_name IN (
    'Electrical Engineering', 'Electronics and Communication',
    'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
    'Biomedical Engineering', 'Aerospace Engineering',
    'Environmental Engineering', 'Robotics Engineering', 'Engineering Mathematics'
);

INSERT INTO questions (topic_id, question_text, difficulty, correct_option)
SELECT target.topic_id,
       CONCAT(source.question_text, ' - ', target.topic_name),
       source.difficulty,
       source.correct_option
FROM topics target
JOIN subjects target_subject ON target_subject.subject_id = target.subject_id
JOIN topics source_topic ON source_topic.topic_name = 'C Basics'
JOIN questions source ON source.topic_id = source_topic.topic_id
WHERE target_subject.subject_name IN (
    'Electrical Engineering', 'Electronics and Communication',
    'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
    'Biomedical Engineering', 'Aerospace Engineering',
    'Environmental Engineering', 'Robotics Engineering', 'Engineering Mathematics'
)
  AND NOT EXISTS (
      SELECT 1 FROM questions existing_question
      WHERE existing_question.topic_id = target.topic_id
  );

INSERT INTO question_options (question_id, option_number, option_text)
SELECT target.question_id, source_option.option_number, source_option.option_text
FROM questions target
JOIN topics target_topic ON target_topic.topic_id = target.topic_id
JOIN topics source_topic ON source_topic.topic_name = 'C Basics'
JOIN questions source
    ON source.topic_id = source_topic.topic_id
   AND target.question_text = CONCAT(source.question_text, ' - ', target_topic.topic_name)
JOIN question_options source_option ON source_option.question_id = source.question_id
WHERE NOT EXISTS (
    SELECT 1 FROM question_options existing_option
    WHERE existing_option.question_id = target.question_id
      AND existing_option.option_number = source_option.option_number
);

INSERT INTO quizzes (subject_id, topic_id, quiz_name, difficulty, level)
SELECT topic.subject_id, topic.topic_id,
       CONCAT(topic.topic_name, ' - Level ', levels.level),
       levels.difficulty,
       levels.level
FROM topics topic
CROSS JOIN (
    SELECT 1 AS level, 'BASIC' AS difficulty
    UNION ALL SELECT 2, 'EASY'
    UNION ALL SELECT 3, 'INTERMEDIATE'
    UNION ALL SELECT 4, 'ADVANCED'
    UNION ALL SELECT 5, 'EXPERT'
) levels
WHERE topic.subject_id IN (
    SELECT subject_id FROM subjects WHERE subject_name IN (
        'Electrical Engineering', 'Electronics and Communication',
        'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering',
        'Biomedical Engineering', 'Aerospace Engineering',
        'Environmental Engineering', 'Robotics Engineering', 'Engineering Mathematics'
    )
)
  AND NOT EXISTS (
      SELECT 1 FROM quizzes existing_quiz
      WHERE existing_quiz.topic_id = topic.topic_id
        AND existing_quiz.level = levels.level
  );