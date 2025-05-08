import bcrypt from 'bcryptjs';
import DBConnection from './../configs/DBConnection';
import { validationResult } from "express-validator";
import profileService from './../services/profileService';

let getUserProfile = async (req, res) => {
    try {
        let userId = req.user.id;
        DBConnection.query(
            'SELECT id, fullname, email FROM users WHERE id = ?',
            [userId],
            function(err, results) {
                if (err) {
                    req.flash("errors", err);
                    return res.redirect("/");
                }
                if (results.length > 0) {
                    return res.render("profile.ejs", { user: results[0] });
                }
            }
        );
    } catch (error) {
        req.flash("errors", error.message);
        return res.redirect("/");
    }
};


let updateUserProfile = async (req, res) => {
    let userId = req.user.id;
    let data = {
        fullname: req.body.fullname,
        newPassword: req.body.newPassword,
        confirmNewPassword: req.body.confirmNewPassword,
        oldPassword: req.body.oldPassword
    };

    try {
        await profileService.updateProfile(userId, data);
        req.flash("success", "Profile updated successfully.");
        return res.redirect("/profile");
    } catch (error) {
        req.flash("errors", error);
        return res.redirect("/profile");
    }
};

module.exports = {
    getUserProfile: getUserProfile,
    updateUserProfile: updateUserProfile
};
