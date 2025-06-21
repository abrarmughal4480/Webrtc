import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/errorHandler.js";
import UserModel from '../models/user.js'; 

export const isAuthenticate = async (req,res,next) => {
    try{
        const token = req.cookies.token;
        console.log(req.isAuthenticate,'sssssss');
        
        // if(!token) throw new ErrorHandler('Unauthorize user',401);
        let user;
        if(token){
            const decodeToken = jwt.verify(token,process.env.JWT_SECRET);
            user = await UserModel.findById(decodeToken._id);
        }
        
        
        if(!user && req.user){
            user = await UserModel.findById(req.user._id);
        }
        
        if(!user) throw new ErrorHandler('Unauthorize user',401);
       
        req.user = user;

        next()
       

    }catch(err){
    
        res.status(err.statusCode || 501).json({
            success: false,
            message: err.message
        })
    }
}


export const isCheckRole = (role) => async (req,res,next) => {
    try{
        if(req.user.role != role){
            throw new ErrorHandler(`Only ${role} can do this opretion`,401);
        }

        next()
       

    }catch(err){
    
        res.status(err.statusCode || 501).json({
            success: false,
            message: err.message
        })
    }
}