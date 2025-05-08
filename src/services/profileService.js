import bcrypt from 'bcryptjs';
import DBConnection from './../configs/DBConnection';

let updateProfile = (userId, data) => {
    return new Promise(async (resolve, reject) => {
        const { fullname, newPassword, confirmNewPassword, oldPassword } = data;

        
        DBConnection.query('SELECT password FROM users WHERE id = ?', [userId], async (err, results) => {
            if (err) {
                return reject(err);
            }
            if (results.length > 0) {
                const currentPassword = results[0].password;
                const validPassword = await bcrypt.compare(oldPassword, currentPassword);
                if (!validPassword) {
                    return reject("Old password is incorrect.");
                }

                
                if (newPassword && confirmNewPassword) {
                    if (newPassword !== confirmNewPassword) {
                        return reject("New passwords do not match.");
                    } else {
                        const hashedPassword = await bcrypt.hash(newPassword, 10);

                        
                        DBConnection.query(
                            'UPDATE users SET fullname = ?, password = ? WHERE id = ?',
                            [fullname, hashedPassword, userId],
                            (err, results) => {
                                if (err) {
                                    return reject(err);
                                }
                                resolve("Profile updated successfully.");
                            }
                        );
                    }
                } else {
                    
                    DBConnection.query(
                        'UPDATE users SET fullname = ? WHERE id = ?',
                        [fullname, userId],
                        (err, results) => {
                            if (err) {
                                return reject(err);
                            }
                            resolve("Profile updated without changing password.");
                        }
                    );
                }
            } else {
                reject("User not found.");
            }
        });
    });
};

module.exports = {
    updateProfile
};
