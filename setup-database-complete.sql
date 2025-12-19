-- ============================================
-- KOMPLETNA SKRIPTA ZA SETUP BAZE PODATAKA
-- Helper App - Autism Support Application
-- ============================================

-- 1. Kreiranje tabele activities
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Dodavanje osnovnih aktivnosti
INSERT INTO activities (id, title, description, category, difficulty_level) VALUES
(1, 'Složi Oblik', 'Igra prepoznavanja i uparivanja geometrijskih oblika', 'Kognitivne veštine', 1),
(2, 'Memorija Boja', 'Igra memorije sa bojama', 'Memorija', 2),
(3, 'Brojanje', 'Vežba brojanja i osnovne matematike', 'Matematika', 1),
(4, 'Slagalica', 'Slaganje slika i puzzle', 'Logika', 2),
(5, 'Emocije', 'Prepoznavanje emocija na licima', 'Socijalne veštine', 1)
ON DUPLICATE KEY UPDATE 
    title = VALUES(title),
    description = VALUES(description),
    category = VALUES(category),
    difficulty_level = VALUES(difficulty_level);

-- 3. Kreiranje tabele progress_logs
CREATE TABLE IF NOT EXISTS progress_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    child_id INT NOT NULL,
    activity_id INT NOT NULL,
    success_level ENUM('struggled', 'partial', 'successful', 'excellent') NOT NULL,
    duration_minutes INT,
    notes TEXT,
    mood_before ENUM('very_upset', 'upset', 'neutral', 'happy', 'very_happy'),
    mood_after ENUM('very_upset', 'upset', 'neutral', 'happy', 'very_happy'),
    recorded_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (child_id) REFERENCES children(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Provera kreiranih tabela
SHOW TABLES;

-- 5. Provera strukture activities tabele
DESCRIBE activities;

-- 6. Provera strukture progress_logs tabele
DESCRIBE progress_logs;

-- 7. Provera unetih aktivnosti
SELECT * FROM activities;

-- ============================================
-- GOTOVO! Sada možete koristiti igre.
-- ============================================
