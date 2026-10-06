const asyncHandler = (requesthandler) => {
   return (req, res, next) => {
    Promise.resolve(requesthandler(req, res, next)).catch((err) => {
        if (res.headersSent) {
            next(err);
            return;
        }
        const statusCode = err.statuscode || err.status || err.code || 500;
        res.status(statusCode).json({
            status: statusCode,
            success: false,
            message: err.message || "Internal Server Error",
            errors: err.errors || []
        });
    });
}};

export {asyncHandler};


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