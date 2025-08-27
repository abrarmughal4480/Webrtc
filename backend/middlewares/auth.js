import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/errorHandler.js";
import UserModel from '../models/user.js'; 

export const isAuthenticate = async (req,res,next) => {
    try{
        let token = req.cookies.token;
        
        // If no token in cookies, check Authorization header
        if (!token && req.headers.authorization) {
            const authHeader = req.headers.authorization;
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }
        
        // if(!token) throw new ErrorHandler('Unauthorize user',401);
        let user;
        if(token){
            try {
                const decodeToken = jwt.verify(token,process.env.JWT_SECRET);
                user = await UserModel.findById(decodeToken._id);
            } catch (jwtError) {
                console.error('JWT verification failed:', jwtError.message);
                throw new ErrorHandler('Invalid or expired token', 401);
            }
        }
        
        
        if(!user && req.user){
            user = await UserModel.findById(req.user._id);
        }
        
        if(!user) {
            throw new ErrorHandler('Unauthorize user',401);
        }
       
        req.user = user;

        next()
       

    }catch(err){
        console.error('Authentication error:', err.message);
        res.status(err.statusCode || 401).json({
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
    
        res.status(err.statusCode || 401).json({
            success: false,
            message: err.message
        })
    }
}