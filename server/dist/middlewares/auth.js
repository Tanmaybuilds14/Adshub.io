import * as Sentry from '@sentry/node';
export const protect = async (req, res, next) => {
    try {
        const { userId } = req.auth();
        if (!userId) {
            return res.status(400).json({ msg: 'Unauthorized' });
        }
        next();
    }
    catch (error) {
        Sentry.captureException(error);
        res.status(401).json({ msg: error.code || error.message });
    }
};
//# sourceMappingURL=auth.js.map