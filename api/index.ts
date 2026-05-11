export default async (req: any, res: any) => {
  const app = (await import('../server/app.js')).default;
  return app(req, res);
};
