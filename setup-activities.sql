-- Kreiranje tabele activities ako ne postoji
CREATE TABLE IF NOT EXISTS activities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    difficulty_level INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Dodavanje osnovnih aktivnosti
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

-- Provera da li su aktivnosti uspešno dodate
SELECT * FROM activities;
