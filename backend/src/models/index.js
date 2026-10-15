/**
 * Central model registry.
 *
 * Mongoose only "registers" a schema (making it resolvable by name for
 * .populate('field') and ref lookups) when its model file is actually
 * require()'d somewhere. Individual services only require the specific
 * models they operate on directly (e.g. doctor.service.js requires
 * Doctor, not Department) - which is correct for keeping modules
 * decoupled, but it means a model that's only ever referenced indirectly
 * via `ref: 'Department'` (and populated, never queried directly) could
 * otherwise never get required at all, causing
 * `MissingSchemaError: Schema hasn't been registered for model "X"` the
 * first time something tries to populate it.
 *
 * Requiring this single file once at app boot (see app.js) guarantees
 * every model is registered before any request is handled, regardless of
 * which services happen to import which models directly.
 */
require('./User');
require('./Doctor');
require('./Department');
require('./DoctorSchedule');
require('./Patient');
require('./Appointment');
require('./RefreshToken');
require('./AuditLog');
