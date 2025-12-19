-- Kreiranje tabele progress_logs ako ne postoji
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

-- Provera da li je tabela uspešno kreirana
DESCRIBE progress_logs;
