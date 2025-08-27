// utils/mongoId.js - Nayi file banao
import { ObjectId } from 'bson';

// Generate real MongoDB ObjectId using bson
export const generateMongoId = () => {
  return new ObjectId().toString();
};

// Validate if ID is MongoDB ObjectId format
export const isValidMongoId = (id) => {
  try {
    return ObjectId.isValid(id);
  } catch {
    return false;
  }
};

// Create ObjectId from string
export const createObjectId = (id) => {
  try {
    return new ObjectId(id);
  } catch {
    return new ObjectId();
  }
};