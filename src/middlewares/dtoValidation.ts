import { ValidationError, validate } from "class-validator";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { plainToInstance } from "class-transformer";

export function dtoValidation(type: any): RequestHandler {
    return async (req: Request, res: Response, next: NextFunction) => {
        const dtoObj = plainToInstance(type, req.body);
        const errors:ValidationError[] = await validate(dtoObj)
        if(errors.length>0) {
            res.send({
                message: errors.map((item)=>{
                    return({
                        field: item.property,
                        errors: Object.values(item.constraints as object)
                    })
                })
            })
        } else {
            req.body = dtoObj;
            next()
        }
    }
}