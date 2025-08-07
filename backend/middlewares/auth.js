import jwt from "jsonwebtoken";
import ErrorHandler from "../utils/errorHandler.js";
import UserModel from '../models/user.js'; 

export const isAuthenticate = async (req,res,next) => {
    try{
        const token = req.cookies.token;
        console.log('🔐 [isAuthenticate] Token present:', !!token);
        console.log('🔐 [isAuthenticate] Request cookies:', req.cookies);
        
        // if(!token) throw new ErrorHandler('Unauthorize user',401);
        let user;
        if(token){
            const decodeToken = jwt.verify(token,process.env.JWT_SECRET);
            console.log('🔐 [isAuthenticate] Decoded token:', { _id: decodeToken._id });
            user = await UserModel.findById(decodeToken._id);
            console.log('🔐 [isAuthenticate] User found from token:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');
        }
        
        
        if(!user && req.user){
            console.log('🔐 [isAuthenticate] Using req.user as fallback');
            user = await UserModel.findById(req.user._id);
            console.log('🔐 [isAuthenticate] User found from req.user:', user ? { _id: user._id, email: user.email, role: user.role } : 'null');
        }
        
        if(!user) {
            console.log('❌ [isAuthenticate] No user found, throwing error');
            throw new ErrorHandler('Unauthorize user',401);
        }
       
        console.log('✅ [isAuthenticate] User authenticated successfully:', { _id: user._id, email: user.email, role: user.role });
        req.user = user;

        next()
       

    }catch(err){
        console.error('❌ [isAuthenticate] Authentication error:', err.message);
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