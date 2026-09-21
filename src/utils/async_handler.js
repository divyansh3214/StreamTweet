const asyncHandler = (requesthandler) => {
   return (req, res, next) => {
    Promise.resolve(requesthandler(req, res, next)).catch((err) => {
        res.status(err.code || 500).json({
            success: false,
            message: err.message || "Internal Server Error"
        });
        next(err);
    });
}};

export default asyncHandler;


/*const asyncHandler = (fn) =>async (req, res, next) => {
    try {
        await fn(req, res, next);
    } catch (err) {
        res.status(err.code || 500).json({
            success: false,
            message: err.message || "Internal Server Error",
        });
        next(err);
    }
};*/