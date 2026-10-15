/**
 * Enforces the single consistent response envelope required across every
 * endpoint: { success, message, data, meta }.
 */
class ApiResponse {
  constructor(statusCode, message = 'Success', data = null, meta = null) {
    this.success = statusCode < 400;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }

  send(res) {
    const { statusCode, ...body } = this;
    return res.status(statusCode).json(body);
  }
}

module.exports = ApiResponse;
