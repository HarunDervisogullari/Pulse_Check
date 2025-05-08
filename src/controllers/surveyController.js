import { validationResult } from "express-validator";
import surveyService from "./../services/surveyService";
import DBConnection from "./../configs/DBConnection";
import { parseString, Builder } from 'xml2js';
import fs from 'fs';
import path from 'path';
import { json } from "body-parser";
import Chart from "chart.js";

let getCreateSurveyPage = (req, res) => {
    return res.render("createSurvey.ejs", {
        errors: req.flash("errors"),
        success: req.flash("success") 
    });
};

let handleCreateSurvey = async (req, res) => {
    let errorsArr = [];
    let validationErrors = validationResult(req);
    if (!validationErrors.isEmpty()) {
        let errors = Object.values(validationErrors.mapped());
        errors.forEach((item) => {
            errorsArr.push(item.msg);
        });
        req.flash("errors", errorsArr);
        return res.redirect("/createSurvey");
    }

    try {
        const { title, description, is_private, passcode, questionText, questionType } = req.body;
        const surveyId = await surveyService.handleCreateSurvey(title, description, req.user.id, is_private === 'on', passcode);
        if (questionText && questionText.length) {
            await surveyService.handleAddQuestions(surveyId, questionText, questionType, req.body);
        }
        req.flash("success", "Survey created successfully!");
        return res.redirect("/mySurveys");
    } catch (err) {
        req.flash("errors", [err.message || "Failed to create survey"]);
        return res.redirect("/createSurvey");
    }
};



let getMySurveys = async (req, res) => {
    try {
        const surveys = await surveyService.getUserSurveys(req.user.id);
        return res.render("mySurveys.ejs", { 
            surveys: surveys,
            success: req.flash("success"),
            errors: req.flash("errors")
        });
    } catch (error) {
        req.flash("errors", error.message);
        return res.redirect("/homepage");
    }
};


let viewSurvey = async (req, res) => {
    try {
        let surveyId = req.params.id;  
        let survey = await surveyService.getSurveyById(surveyId); 
        if (!survey) {
            req.flash("errors", "Survey not found.");
            return res.redirect("/mySurveys");
        }
        
        if (survey.is_private) {
            return res.render("enterPasscode.ejs", { surveyId: surveyId });
        }
        
        return res.render("viewSurvey.ejs", { survey: survey });
    } catch (err) {
        req.flash("errors", [err.message || "Failed to load survey details"]);
        return res.redirect("/mySurveys");
    }
};

let deleteSurvey = async (req, res) => {
    try {
        let surveyId = req.params.id;
        await surveyService.handleDeleteSurvey(surveyId);
        req.flash('success', 'Survey deleted successfully.');
        res.redirect('/mySurveys');
    } catch (error) {
        req.flash('errors', error.message);
        res.redirect('/mySurveys');
    }
};


let getEditSurveyPage = async (req, res) => {
    try {
        let surveyId = req.params.id;
        let survey = await surveyService.getSurveyById(surveyId);
        if (!survey) {
            req.flash("errors", "Survey not found.");
            return res.redirect("/mySurveys");
        }
        return res.render("editSurvey.ejs", { survey: survey });
    } catch (err) {
        req.flash("errors", [err.message || "Failed to load survey details"]);
        return res.redirect("/mySurveys");
    }
};

let handleUpdateSurvey = async (req, res) => {
    try {
        const surveyId = req.params.id;
        const { title, description, questions, newQuestions, deletedQuestions } = req.body;

        await surveyService.handleUpdateSurvey(surveyId, title, description);

        if (deletedQuestions) {
            const deletedQuestionsArray = deletedQuestions.split(',').map(Number);
            await Promise.all(deletedQuestionsArray.map(questionId => surveyService.handleDeleteQuestion(questionId)));
        }

        if (questions) {
            await Promise.all(questions.map(async (question, index) => {
                const { question_id, question_text, options, question_type } = question;
                if (question_id) {
                    await surveyService.handleUpdateQuestion(question_id, question_text);
                    if (options && options.length > 0) {
                        await Promise.all(options.map(async (option) => {
                            if (option.option_id) {
                                if (!option.option_text) {
                                    await surveyService.handleDeleteOption(option.option_id);
                                } else {
                                    await surveyService.handleUpdateOption(option.option_id, option.option_text);
                                }
                            } else {
                                await surveyService.handleAddOption(question_id, option.option_text);
                            }
                        }));
                    }
                }
            }));
        }

        if (newQuestions) {
            await Promise.all(newQuestions.map(async (question, index) => {
                const { question_text, question_type, options, checkboxes } = question;
                const questionId = await surveyService.handleAddQuestion(surveyId, question_text, question_type);
                if (question_type === 'multiple_choice' && options) {
                    await Promise.all(options.map(async (option_text) => {
                        await surveyService.handleAddOption(questionId, option_text);
                    }));
                } else if (question_type === 'checkbox' && checkboxes) {
                    await Promise.all(checkboxes.map(async (option_text) => {
                        await surveyService.handleAddOption(questionId, option_text);
                    }));
                }
            }));
        }

        req.flash("success", "Survey updated successfully.");
        res.cookie('surveyUpdated', true, { maxAge: 3000 });
        return res.redirect(`/edit-survey/${req.params.id}`);
    } catch (error) {
        req.flash("errors", error.message);
        return res.redirect(`/edit-survey/${req.params.id}`);
    }
};




let getSearchSurveysPage = (req, res) => {
    return res.render("searchSurveys.ejs", {
        errors: req.flash("errors")
    });
};

let handleSearchSurveys = async (req, res) => {
    try {
        const searchTerm = req.body.searchTerm;
        const userId = req.user.id;
        const surveys = await surveyService.searchSurveys(searchTerm, userId);
        return res.render("searchSurveys.ejs", {
            surveys: surveys,
            searchTerm: searchTerm
        });
    } catch (err) {
        req.flash("errors", [err.message || "Failed to search surveys"]);
        return res.redirect("/searchSurveys");
    }
};

let handleSubmitSurvey = async (req, res) => {
    try {
        const surveyId = req.params.id;
        const userId = req.user.id;
        const answers = req.body;

        await surveyService.saveSurveyAnswers(surveyId, userId, answers);

        req.flash("success", "Survey answers submitted successfully.");
        return res.redirect("/mySurveys");
    } catch (err) {
        req.flash("errors", [err.message || "Failed to submit survey answers"]);
        return res.redirect(`/survey/${req.params.id}`);
    }
};


let exportSurveyAsXML = async (req, res) => {
    try {
        let surveyId = req.params.id;
        let survey = await surveyService.getSurveyById(surveyId);
        if (!survey) {
            req.flash("errors", "Survey not found.");
            return res.redirect("/mySurveys");
        }

    
        const builder = new Builder();
        const xml = builder.buildObject({ survey });

        
        res.setHeader('Content-Type', 'application/xml');
        res.setHeader('Content-Disposition', `attachment; filename=survey_${surveyId}.xml`);
        return res.send(xml);
    } catch (err) {
        req.flash("errors", [err.message || "Failed to export survey as XML"]);
        return res.redirect("/mySurveys");
    }
};

let importSurveyAnswers = async (req, res) => {
    try {
        if (!req.file) {
            req.flash("errors", "No file uploaded.");
            return res.redirect("/createSurvey");
        }

        let surveyXML = fs.readFileSync(req.file.path, 'utf8');
        parseString(surveyXML, async (err, result) => {
            if (err) {
                req.flash("errors", "Failed to parse XML file.");
                return res.redirect("/createSurvey");
            }

            let surveyData = result.survey;
            const surveyId = await surveyService.handleCreateSurvey(surveyData.title[0], surveyData.description[0], req.user.id);

            if (surveyData.questions && surveyData.questions[0] && surveyData.questions[0].question) {
                let questions = surveyData.questions[0].question.map(q => q.question_text[0]);
                let types = surveyData.questions[0].question.map(q => q.question_type[0]);
                let requestBody = {};
                surveyData.questions[0].question.forEach((q, index) => {
                    if (q.options && q.options[0] && q.options[0].option) {
                        requestBody[`option_${index + 1}`] = q.options[0].option.map(o => o.option_text[0]);
                    }
                });

                await surveyService.handleAddQuestions(surveyId, questions, types, requestBody);
            }

            fs.unlinkSync(req.file.path);
            res.redirect(`/edit-survey/${surveyId}`);
        });
    } catch (err) {
        req.flash("errors", err.message || "Failed to import survey.");
        res.redirect("/createSurvey");
    }
};
let handleEnterPasscode = async (req, res) => {
    try {
        let surveyId = req.body.surveyId;
        let enteredPasscode = req.body.passcode;
        let survey = await surveyService.getSurveyById(surveyId);
        
        if (survey.passcode === enteredPasscode) {
            return res.render("viewSurvey.ejs", { survey: survey });
        } else {
            req.flash("errors", "Incorrect passcode.");
            return res.redirect(`/survey/${surveyId}`);
        }
    } catch (err) {
        req.flash("errors", [err.message || "Failed to validate passcode"]);
        return res.redirect(`/survey/${req.body.surveyId}`);
    }
};
let viewStatistics = async (req, res) => {
    try {
        let surveyId = req.params.id;
        let survey = await surveyService.getSurveyById(surveyId);
        if (!survey) {
            req.flash("errors", "Survey not found.");
            return res.redirect("/mySurveys");
        }

        let statistics = await surveyService.getSurveyStatistics(surveyId);
        return res.render("viewStatistics.ejs", { survey: survey, statistics: statistics });
    } catch (err) {
        req.flash("errors", [err.message || "Failed to load survey statistics"]);
        return res.redirect("/mySurveys");
    }
};
let viewSurveyStatistics = async (req, res) => {
    try {
        let surveyId = req.params.id;
        let survey = await surveyService.getSurveyById(surveyId);
        if (!survey) {
            req.flash("errors", "Survey not found.");
            return res.redirect("/mySurveys");
        }

        let statistics = await surveyService.getSurveyStatistics(surveyId);

        return res.render("viewStatistics.ejs", { survey: survey, statistics: statistics });
    } catch (err) {
        req.flash("errors", [err.message || "Failed to load survey statistics"]);
        return res.redirect("/mySurveys");
    }
};
module.exports = {
    getCreateSurveyPage,
    handleCreateSurvey,
    getMySurveys,
    viewSurvey,
    deleteSurvey,
    getEditSurveyPage,
    handleUpdateSurvey,
    getSearchSurveysPage,
    handleSearchSurveys,
    handleSubmitSurvey,
    exportSurveyAsXML,
    importSurveyAnswers,
    viewStatistics, 
    handleEnterPasscode,
    viewSurveyStatistics
};