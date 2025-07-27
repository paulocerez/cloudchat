import { Global, Module } from "@nestjs/common";
import { db } from ".";

@Global()
@Module({
  providers: [
    {
        provide: 'DATABASE_CONNECTION',
        useValue: db
    }
  ],
  exports: ['DATABASE_CONNECTION'],
})
export class DatabaseModule {}