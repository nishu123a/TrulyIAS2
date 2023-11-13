const Joi = require('@hapi/joi')

/**
 * validates user fields as follows
 *  username: must be a string with alphanumerical characters,
 *  with length less that 30 and bigger than 3
 *
 *  password: must be between 8 to 32 characters long,
 *  must include one lowercase letter, one uppercase letter
 *    numbers, and no spaces
 *
 *  email: must be a valid email with valid tlds, ie (something@asd.fb) is not allowed
 *    check: https://en.wikipedia.org/wiki/List_of_Internet_top-level_domains
 *  dateOfBirth: must be a string in american format (month-day-year)
 * */
const validate = async (username, password, email, dateOfBirth) => {
  const schema = Joi.object({
    username: Joi.string()
      .alphanum()
      .min(3)
      .max(30)
      .required(),
    password: Joi.string()
      .pattern(new RegExp('^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?!.*\\s).{8,32}$')),
    dateOfBirth: Joi.date(),
    email: Joi.string()
      .email(),
  })

  const { error } = await schema.validate({
    username,
    password,
    email,
    dateOfBirth,
  })

  return error
}

module.exports = {
  validate,
}
