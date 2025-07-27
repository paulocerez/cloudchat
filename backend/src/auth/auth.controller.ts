import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

@Controller('api/auth')
export class AuthController {
  @All('*')
  catchAll(
    @Param('*') wildcard: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    console.log(`Auth catch-all route hit: ${req.method} /api/auth/${wildcard}`);
    console.log('Request body:', req.body);
    console.log('Request headers:', req.headers);
    
    // You can implement your custom logic here
    // For example, you might want to:
    // - Log the request
    // - Forward to another service
    // - Return a specific response
    // - Handle authentication logic
    
    return res.status(200).json({
      message: 'Auth catch-all route handler',
      path: `/api/auth/${wildcard}`,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }
} 