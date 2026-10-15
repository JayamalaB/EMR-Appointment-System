const ApiError = require('../utils/ApiError');

/**
 * Runs a Zod schema against req.body/query/params and replaces the
 * respective req object with the parsed (type-coerced, defaulted) result.
 * Keeps validation declarative in validators/*.js and out of controllers.
 */
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      return next(ApiError.badRequest('Validation failed', details));
    }

    if (result.data.body) req.body = result.data.body;
    if (result.data.query) req.query = result.data.query;
    if (result.data.params) req.params = result.data.params;
    next();
  };
}

module.exports = validate;
