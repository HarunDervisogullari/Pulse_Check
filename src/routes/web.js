import express from "express";
import homePageController from "../controllers/homePageController";
import registerController from "../controllers/registerController";
import loginController from "../controllers/loginController";
import auth from "../validation/authValidation";
import passport from "passport";
import initPassportLocal from "../controllers/passportLocalController";

import surveyController from "../controllers/surveyController";
import profileController from "../controllers/profileController";
import multer from 'multer';

initPassportLocal();

let router = express.Router();

let initWebRoutes = (app) => {
    router.get("/", (req, res) => {
        res.render("landingPage.ejs");
    });

    router.get("/login", loginController.checkLoggedOut, loginController.getPageLogin);
    router.post("/login", passport.authenticate("local", {
        successRedirect: "/homepage",
        failureRedirect: "/login",
        successFlash: true,
        failureFlash: true
    }));

    const upload = multer({ dest: 'uploads/' });

    router.get("/register", registerController.getPageRegister);
    router.post("/register", auth.validateRegister, async (req, res, next) => {
        try {
            await registerController.createNewUser(req, res, next);
            res.redirect("/homepage");
        } catch (err) {
            next(err);
        }
    });

    router.post("/logout", loginController.postLogOut);

    router.get("/homepage", loginController.checkLoggedIn, homePageController.handleHelloWorld);

    router.get("/createSurvey", loginController.checkLoggedIn, surveyController.getCreateSurveyPage);
    router.post("/createSurvey", loginController.checkLoggedIn, surveyController.handleCreateSurvey);
    
    router.get("/mySurveys", loginController.checkLoggedIn, surveyController.getMySurveys);
    router.get("/survey/:id", loginController.checkLoggedIn, surveyController.viewSurvey);

    router.get("/profile", loginController.checkLoggedIn, profileController.getUserProfile);
    router.post("/profile", loginController.checkLoggedIn, profileController.updateUserProfile);
    router.post("/profile/update", loginController.checkLoggedIn, profileController.updateUserProfile);

    router.post("/delete-survey/:id", loginController.checkLoggedIn, surveyController.deleteSurvey);

    router.get("/edit-survey/:id", loginController.checkLoggedIn, surveyController.getEditSurveyPage);
    router.post("/update-survey/:id", loginController.checkLoggedIn, surveyController.handleUpdateSurvey);

    router.get("/searchSurveys", loginController.checkLoggedIn, surveyController.getSearchSurveysPage);
    router.post("/searchSurveys", loginController.checkLoggedIn, surveyController.handleSearchSurveys);

    router.post("/submitSurvey/:id", loginController.checkLoggedIn, surveyController.handleSubmitSurvey);

    router.get("/export-survey/:id", loginController.checkLoggedIn, surveyController.exportSurveyAsXML);
    router.post("/import-survey-answers", loginController.checkLoggedIn, upload.single('xml'), surveyController.importSurveyAnswers);

    router.post('/survey/enterPasscode', loginController.checkLoggedIn, surveyController.handleEnterPasscode);
    router.get("/view-statistics/:id", loginController.checkLoggedIn, surveyController.viewStatistics);
    router.get("/statistics/:id", loginController.checkLoggedIn, surveyController.viewSurveyStatistics);
    return app.use("/", router);
};

module.exports = initWebRoutes;
