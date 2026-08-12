import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Prisma } from '@creatormarket/database';

@Injectable()
export class SerializeInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(map((data) => this.serialize(data)));
  }

  private serialize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }
    
    if (typeof data === 'bigint') {
      return Number(data);
    }
    
    if (Prisma.Decimal.isDecimal(data)) {
      return data.toNumber();
    }
    
    if (Array.isArray(data)) {
      return data.map((item) => this.serialize(item));
    }
    
    if (typeof data === 'object') {
      if (data instanceof Date) {
        return data;
      }
      
      const serializedObj: any = {};
      for (const key of Object.keys(data)) {
        serializedObj[key] = this.serialize(data[key]);
      }
      return serializedObj;
    }
    
    return data;
  }
}
