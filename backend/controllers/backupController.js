import catchAsyncError from '../middlewares/catchAsyncError.js';
import sendResponse from '../utils/sendResponse.js';
import ErrorHandler from '../utils/errorHandler.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Backup directory path
const BACKUP_DIR = path.join(__dirname, '../backups');

// Ensure backup directory exists
if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

// Get MongoDB connection details from environment
const getMongoConfig = () => {
    const dbUrl = process.env.DB_URL;
    if (!dbUrl) {
        throw new ErrorHandler('Database URL not configured', 500);
    }

    // Parse MongoDB connection string
    const url = new URL(dbUrl);
    const host = url.hostname;
    const port = url.port || '27017';
    const database = url.pathname.substring(1); // Remove leading slash
    const username = url.username;
    const password = url.password;

    return {
        host,
        port,
        database,
        username,
        password,
        url: dbUrl
    };
};

// Create backup using mongodump
export const createBackup = catchAsyncError(async (req, res, next) => {
    try {
        const { collections, compression = true } = req.body;
        const mongoConfig = getMongoConfig();
        
        // Generate backup filename with timestamp
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `backup_${mongoConfig.database}_${timestamp}`;
        const backupPath = path.join(BACKUP_DIR, backupName);
        
        // Create backup directory
        if (!fs.existsSync(backupPath)) {
            fs.mkdirSync(backupPath, { recursive: true });
        }

        // Build mongodump command
        let command = `mongodump`;
        
        if (mongoConfig.username && mongoConfig.password) {
            command += ` --uri="${mongoConfig.url}"`;
        } else {
            command += ` --host ${mongoConfig.host} --port ${mongoConfig.port}`;
            if (mongoConfig.username) {
                command += ` --username ${mongoConfig.username}`;
            }
            if (mongoConfig.password) {
                command += ` --password ${mongoConfig.password}`;
            }
            command += ` --db ${mongoConfig.database}`;
        }
        
        // Add output directory
        command += ` --out ${backupPath}`;
        
        // Add collections if specified
        if (collections && Array.isArray(collections) && collections.length > 0) {
            collections.forEach(collection => {
                command += ` --collection ${collection}`;
            });
        }
        
        // Add compression if requested
        if (compression) {
            command += ` --gzip`;
        }

        console.log('Executing backup command:', command);
        
        // Execute backup command
        const { stdout, stderr } = await execAsync(command);
        
        if (stderr && !stderr.includes('WARNING')) {
            console.error('Backup stderr:', stderr);
        }
        
        console.log('Backup stdout:', stdout);
        
        // Check if backup was successful
        const backupFiles = fs.readdirSync(backupPath);
        if (backupFiles.length === 0) {
            throw new ErrorHandler('Backup failed - no files created', 500);
        }
        
        // Create metadata file
        const metadata = {
            timestamp: new Date().toISOString(),
            database: mongoConfig.database,
            collections: collections || 'all',
            compression: compression,
            backupPath: backupPath,
            fileCount: backupFiles.length,
            size: getDirectorySize(backupPath)
        };
        
        const metadataPath = path.join(backupPath, 'backup-metadata.json');
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Compress the entire backup folder
        const compressedPath = `${backupPath}.tar.gz`;
        const tarCommand = `tar -czf "${compressedPath}" -C "${BACKUP_DIR}" "${backupName}"`;
        
        await execAsync(tarCommand);
        
        // Remove uncompressed backup folder
        fs.rmSync(backupPath, { recursive: true, force: true });
        
        // Get final file size
        const finalSize = fs.statSync(compressedPath).size;
        
        const response = {
            success: true,
            message: 'Database backup created successfully',
            backup: {
                filename: path.basename(compressedPath),
                path: compressedPath,
                size: formatBytes(finalSize),
                sizeBytes: finalSize,
                timestamp: metadata.timestamp,
                database: metadata.database,
                collections: metadata.collections,
                compression: metadata.compression
            }
        };
        
        return sendResponse(res, 200, response);
        
    } catch (error) {
        console.error('Backup error:', error);
        return next(new ErrorHandler(`Backup failed: ${error.message}`, 500));
    }
});

// List all available backups
export const listBackups = catchAsyncError(async (req, res, next) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return sendResponse(res, 200, { backups: [] });
        }
        
        const files = fs.readdirSync(BACKUP_DIR);
        const backups = [];
        
        for (const file of files) {
            if (file.endsWith('.tar.gz')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = fs.statSync(filePath);
                
                backups.push({
                    filename: file,
                    path: filePath,
                    size: formatBytes(stats.size),
                    sizeBytes: stats.size,
                    createdAt: stats.birthtime,
                    modifiedAt: stats.mtime
                });
            }
        }
        
        // Sort by creation time (newest first)
        backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        return sendResponse(res, 200, { 
            backups,
            totalCount: backups.length,
            totalSize: formatBytes(backups.reduce((sum, backup) => sum + backup.sizeBytes, 0))
        });
        
    } catch (error) {
        console.error('List backups error:', error);
        return next(new ErrorHandler(`Failed to list backups: ${error.message}`, 500));
    }
});

// Download a specific backup
export const downloadBackup = catchAsyncError(async (req, res, next) => {
    try {
        const { filename } = req.params;
        
        if (!filename || !filename.endsWith('.tar.gz')) {
            return next(new ErrorHandler('Invalid backup filename', 400));
        }
        
        const filePath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return next(new ErrorHandler('Backup file not found', 404));
        }
        
        const stats = fs.statSync(filePath);
        
        res.setHeader('Content-Type', 'application/gzip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', stats.size);
        
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
        
    } catch (error) {
        console.error('Download backup error:', error);
        return next(new ErrorHandler(`Failed to download backup: ${error.message}`, 500));
    }
});

// Delete a specific backup
export const deleteBackup = catchAsyncError(async (req, res, next) => {
    try {
        const { filename } = req.params;
        
        if (!filename || !filename.endsWith('.tar.gz')) {
            return next(new ErrorHandler('Invalid backup filename', 400));
        }
        
        const filePath = path.join(BACKUP_DIR, filename);
        
        if (!fs.existsSync(filePath)) {
            return next(new ErrorHandler('Backup file not found', 404));
        }
        
        fs.unlinkSync(filePath);
        
        return sendResponse(res, 200, {
            success: true,
            message: 'Backup deleted successfully',
            deletedFile: filename
        });
        
    } catch (error) {
        console.error('Delete backup error:', error);
        return next(new ErrorHandler(`Failed to delete backup: ${error.message}`, 500));
    }
});

// Get backup statistics
export const getBackupStats = catchAsyncError(async (req, res, next) => {
    try {
        if (!fs.existsSync(BACKUP_DIR)) {
            return sendResponse(res, 200, {
                totalBackups: 0,
                totalSize: '0 B',
                totalSizeBytes: 0,
                oldestBackup: null,
                newestBackup: null,
                averageSize: '0 B'
            });
        }
        
        const files = fs.readdirSync(BACKUP_DIR);
        const backupFiles = files.filter(file => file.endsWith('.tar.gz'));
        
        if (backupFiles.length === 0) {
            return sendResponse(res, 200, {
                totalBackups: 0,
                totalSize: '0 B',
                totalSizeBytes: 0,
                oldestBackup: null,
                newestBackup: null,
                averageSize: '0 B'
            });
        }
        
        let totalSize = 0;
        let oldestBackup = null;
        let newestBackup = null;
        
        for (const file of backupFiles) {
            const filePath = path.join(BACKUP_DIR, file);
            const stats = fs.statSync(filePath);
            
            totalSize += stats.size;
            
            if (!oldestBackup || stats.birthtime < oldestBackup) {
                oldestBackup = stats.birthtime;
            }
            
            if (!newestBackup || stats.birthtime > newestBackup) {
                newestBackup = stats.birthtime;
            }
        }
        
        const averageSize = totalSize / backupFiles.length;
        
        return sendResponse(res, 200, {
            totalBackups: backupFiles.length,
            totalSize: formatBytes(totalSize),
            totalSizeBytes: totalSize,
            oldestBackup: oldestBackup?.toISOString(),
            newestBackup: newestBackup?.toISOString(),
            averageSize: formatBytes(averageSize),
            backupDirectory: BACKUP_DIR
        });
        
    } catch (error) {
        console.error('Backup stats error:', error);
        return next(new ErrorHandler(`Failed to get backup stats: ${error.message}`, 500));
    }
});

// Helper function to get directory size
const getDirectorySize = (dirPath) => {
    let totalSize = 0;
    
    const getSize = (currentPath) => {
        const stats = fs.statSync(currentPath);
        if (stats.isDirectory()) {
            const files = fs.readdirSync(currentPath);
            files.forEach(file => {
                getSize(path.join(currentPath, file));
            });
        } else {
            totalSize += stats.size;
        }
    };
    
    getSize(dirPath);
    return totalSize;
};

// Helper function to format bytes
const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
