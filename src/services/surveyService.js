import DBConnection from "./../configs/DBConnection";

let handleCreateSurvey = (title, description, creator_id, is_private = false, passcode = null) => {
    return new Promise((resolve, reject) => {
        try {
            DBConnection.query(
                'INSERT INTO surveys (title, description, creator_id, is_private, passcode) VALUES (?, ?, ?, ?, ?)', 
                [title, description, creator_id, is_private, passcode],
                function(err, results) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results.insertId);
                }
            );
        } catch (err) {
            reject(err);
        }
    });
};

let handleAddQuestions = (surveyId, questions, types, requestBody) => {
    return Promise.all(questions.map(async (questionText, index) => {
        const questionType = types[index];
        const questionResult = await new Promise((resolve, reject) => {
            DBConnection.query(
                'INSERT INTO Questions (survey_id, question_text, question_type) VALUES (?, ?, ?)',
                [surveyId, questionText, questionType],
                function(err, results) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results.insertId);
                }
            );
        });

        if (questionType === 'multiple_choice') {
            const options = requestBody[`option_${index + 1}`] || [];
            await Promise.all(options.map(optionText => {
                return new Promise((resolve, reject) => {
                    DBConnection.query(
                        'INSERT INTO Options (option_text, question_id) VALUES (?, ?)',
                        [optionText, questionResult],
                        function(err, results) {
                            if (err) {
                                reject(err);
                            }
                            resolve(results);
                        }
                    );
                });
            }));
        } else if (questionType === 'checkbox') {
            const checkboxes = requestBody[`checkbox_${index + 1}`] || [];
            await Promise.all(checkboxes.map(checkboxText => {
                return new Promise((resolve, reject) => {
                    DBConnection.query(
                        'INSERT INTO Options (option_text, question_id) VALUES (?, ?)',
                        [checkboxText, questionResult],
                        function(err, results) {
                            if (err) {
                                reject(err);
                            }
                            resolve(results);
                        }
                    );
                });
            }));
        }

        return questionResult;
    }));
};


let getUserSurveys = (creatorId) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'SELECT * FROM Surveys WHERE creator_id = ? ORDER BY created_at DESC',
            [creatorId],
            (err, results) => {
                if (err) reject(err);
                resolve(results);
            }
        );
    });
};

let getSurveyById = (id) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'SELECT s.*, q.question_id, q.question_text, q.question_type, o.option_id, o.option_text ' +
            'FROM surveys s ' +
            'LEFT JOIN questions q ON s.survey_id = q.survey_id ' +
            'LEFT JOIN options o ON q.question_id = o.question_id ' +
            'WHERE s.survey_id = ?', 
            [id],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    let survey = null;
                    const questionsMap = {};

                    results.forEach(row => {
                        if (!survey) {
                            survey = {
                                survey_id: row.survey_id,
                                title: row.title,
                                description: row.description,
                                is_private: row.is_private, 
                                passcode: row.passcode,     
                                created_at: row.created_at,
                                questions: []
                            };
                        }

                        if (row.question_id && !questionsMap[row.question_id]) {
                            questionsMap[row.question_id] = {
                                question_id: row.question_id,
                                question_text: row.question_text,
                                question_type: row.question_type,
                                options: []
                            };
                            survey.questions.push(questionsMap[row.question_id]);
                        }

                        if (row.option_id && questionsMap[row.question_id]) {
                            questionsMap[row.question_id].options.push({
                                option_id: row.option_id,
                                option_text: row.option_text
                            });
                        }
                    });

                    resolve(survey);
                }
            }
        );
    });
};

let handleDeleteSurvey = (surveyId) => {
    return new Promise(async (resolve, reject) => {
        try {
            
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE FROM Answers WHERE survey_id = ?',
                    [surveyId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

           
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE Options FROM Options JOIN Questions ON Options.question_id = Questions.question_id WHERE Questions.survey_id = ?',
                    [surveyId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

            
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE FROM Questions WHERE survey_id = ?',
                    [surveyId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

            
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE FROM Surveys WHERE survey_id = ?',
                    [surveyId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

            resolve();
        } catch (err) {
            reject(err);
        }
    });
};


let handleUpdateSurvey = (surveyId, title, description) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'UPDATE Surveys SET title = ?, description = ? WHERE survey_id = ?',
            [title, description, surveyId],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        );
    });
};

let handleUpdateQuestion = (questionId, questionText) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'UPDATE Questions SET question_text = ? WHERE question_id = ?',
            [questionText, questionId],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        );
    });
};

let handleAddQuestion = (surveyId, questionText, questionType) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'INSERT INTO Questions (survey_id, question_text, question_type) VALUES (?, ?, ?)',
            [surveyId, questionText, questionType],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results.insertId);
                }
            }
        );
    });
};

let handleAddOption = (questionId, optionText) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'INSERT INTO Options (option_text, question_id) VALUES (?, ?)',
            [optionText, questionId],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        );
    });
};
let handleUpdateOption = (optionId, optionText) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'UPDATE Options SET option_text = ? WHERE option_id = ?',
            [optionText, optionId],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        );
    });
};
let handleDeleteOption = (optionId) => {
    return new Promise((resolve, reject) => {
        DBConnection.query(
            'DELETE FROM Options WHERE option_id = ?',
            [optionId],
            function(err, results) {
                if (err) {
                    reject(err);
                } else {
                    resolve(results);
                }
            }
        );
    });
};

let searchSurveys = (searchTerm, userId) => {
    return new Promise((resolve, reject) => {
        const searchPattern = `%${searchTerm}%`;
        DBConnection.query(
            'SELECT * FROM surveys WHERE title LIKE ? AND creator_id != ? ORDER BY created_at DESC',
            [searchPattern, userId],
            (err, results) => {
                if (err) reject(err);
                resolve(results);
            }
        );
    });
};

let saveSurveyAnswers = (surveyId, userId, answers) => {
    return new Promise((resolve, reject) => {
        const queries = [];
        
        for (const key in answers) {
            if (answers.hasOwnProperty(key)) {
                const questionId = key.replace('question', '');
                const answerValues = Array.isArray(answers[key]) ? answers[key] : [answers[key]];

                answerValues.forEach(answer => {
                    queries.push(new Promise((resolve, reject) => {
                        DBConnection.query(
                            'INSERT INTO Answers (survey_id, question_id, user_id, answer_text) VALUES (?, ?, ?, ?)',
                            [surveyId, questionId, userId, answer],
                            (err, results) => {
                                if (err) {
                                    reject(err);
                                } else {
                                    resolve(results);
                                }
                            }
                        );
                    }));
                });
            }
        }

        Promise.all(queries)
            .then(results => resolve(results))
            .catch(err => reject(err));
    });
};

let handleDeleteQuestion = (questionId) => {
    return new Promise(async (resolve, reject) => {
        try {
            
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE FROM Answers WHERE question_id = ?',
                    [questionId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

            
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE FROM Options WHERE question_id = ?',
                    [questionId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

            
            await new Promise((resolve, reject) => {
                DBConnection.query(
                    'DELETE FROM Questions WHERE question_id = ?',
                    [questionId],
                    (err, result) => {
                        if (err) reject(err);
                        resolve(result);
                    }
                );
            });

            resolve();
        } catch (err) {
            reject(err);
        }
    });
};


let getSurveyStatistics = (surveyId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT q.question_id, q.question_text, q.question_type, 
                   o.option_id, o.option_text, 
                   COUNT(a.answer_id) as answer_count
            FROM questions q
            LEFT JOIN options o ON q.question_id = o.question_id
            LEFT JOIN answers a ON q.question_id = a.question_id AND o.option_text = a.answer_text
            WHERE q.survey_id = ?
            GROUP BY q.question_id, o.option_id, o.option_text
        `;

        DBConnection.query(query, [surveyId], (err, results) => {
            if (err) {
                reject(err);
            } else {
                const statistics = {};
                results.forEach(row => {
                    if (!statistics[row.question_id]) {
                        statistics[row.question_id] = {
                            question_text: row.question_text,
                            question_type: row.question_type,
                            options: []
                        };
                    }

                    if (row.option_id) {
                        statistics[row.question_id].options.push({
                            option_text: row.option_text,
                            answer_count: row.answer_count
                        });
                    }
                });
                resolve(statistics);
            }
        });
    });
};

module.exports = {
    handleCreateSurvey,
    handleAddQuestions,
    getUserSurveys,
    getSurveyById,
    handleDeleteSurvey,
    handleUpdateSurvey,
    handleUpdateQuestion,
    handleAddQuestion,
    handleUpdateOption,
    handleDeleteOption,
    handleAddOption,
    searchSurveys,
    saveSurveyAnswers,
    handleDeleteQuestion,
    getSurveyStatistics 
};
