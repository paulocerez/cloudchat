import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { eq } from "drizzle-orm";
import { NodePgDatabase } from "drizzle-orm/node-postgres";
import { users, User, NewUser } from "src/db/schema";
import * as schema from "src/db/schema";

@Injectable()
export class UsersService {
    constructor(@Inject('DATABASE_CONNECTION') private db: NodePgDatabase<typeof schema>) {}
    
    async findAll(): Promise<User[]> {
        return await this.db.select().from(users);
    }

    async findOne(id: number): Promise<User> {
        const [user] = await this.db
          .select()
          .from(users)
          .where(eq(users.id, id));
        
        if (!user) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }
        
        return user;
      }

    async create(userData: Omit<NewUser, 'id' | 'createdAt'>): Promise<User> {
        const [newUser] = await this.db
          .insert(users)
          .values(userData)
          .returning();
        return newUser;
      }

      async update(id: number, userData: Partial<Omit<NewUser, 'id' | 'createdAt'>>): Promise<User> {
        const [updatedUser] = await this.db
          .update(users)
          .set(userData)
          .where(eq(users.id, id))
          .returning();
        
        if (!updatedUser) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }
        
        return updatedUser;
      }
    
      async delete(id: number): Promise<void> {
        const [deletedUser] = await this.db
          .delete(users)
          .where(eq(users.id, id))
          .returning();
        
        if (!deletedUser) {
          throw new NotFoundException(`User with ID ${id} not found`);
        }
      }
}