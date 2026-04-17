import { Request, Response } from "express";
export declare const getUserCredits: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllProjects: (req: Request, res: Response) => Promise<void>;
export declare const getProjectById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const toggleProjectPublic: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=UserControler.d.ts.map