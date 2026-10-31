const { z } = require('zod');

/**
 * Validates request schema using Zod
 * @param {object} schemas - { body, query, params } Zod schemas
 */
const validate = (schemas) => {
  return async (req, res, next) => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.query) {
        req.query = await schemas.query.parseAsync(req.query);
      }
      if (schemas.params) {
        req.params = await schemas.params.parseAsync(req.params);
      }
      return next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        const formattedErrors = err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));

        if (req.xhr || req.headers.accept?.includes('application/json') || req.path.startsWith('/api')) {
          return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: formattedErrors
          });
        }

        // If from a standard form submission, render back or set flash message
        return res.status(400).send(`Validation error: ${formattedErrors.map(e => e.message).join(', ')}`);
      }
      return next(err);
    }
  };
};

module.exports = {
  validate
};

