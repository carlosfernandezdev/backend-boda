/**
 * Envuelve un controller async para que cualquier rejection
 * caiga automáticamente en el errorHandler middleware.
 *
 * Uso:
 *   router.get('/algo', asyncHandler(async (req, res) => {
 *     const data = await algoQuePuedeFallar();
 *     res.json(data);
 *   }));
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
