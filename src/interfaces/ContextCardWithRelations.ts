import { User, Project, ContextCard, Comment } from "@prisma/client";

export interface ContextCardWithRelations extends ContextCard {
  user: User;
  project: Project;
  assignedTo?: User;
  linkedCard?: ContextCard;
  linkedFrom?: ContextCard[];
  comments?: Comment[];
}
