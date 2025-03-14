const Joi = require("joi");

exports.investmentSchema = Joi.object({
     amount: Joi.number().min(3).required()
    })
    