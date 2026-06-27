import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { PostReaction, ReactionType } from './entities/post-reaction.entity';
import { Post } from './entities/post.entity';

export interface ReactionResult {
  postId: string;
  userId: string;
  reaction: ReactionType | null;
  likeCount: number;
  dislikeCount: number;
}

@Injectable()
export class ReactionsService {
  constructor(
    @InjectRepository(Post)
    private readonly postsRepository: Repository<Post>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  setReaction(
    postId: string,
    userId: string,
    type: ReactionType,
  ): Promise<ReactionResult> {
    return this.applyReaction(postId, userId, type);
  }

  removeReaction(postId: string, userId: string): Promise<ReactionResult> {
    return this.applyReaction(postId, userId, null);
  }

  // All reaction writes go through a single transaction that updates the
  // reaction row and recomputes the post's like/dislike counters so the
  // denormalized counts can never drift from the source rows.
  private async applyReaction(
    postId: string,
    userId: string,
    type: ReactionType | null,
  ): Promise<ReactionResult> {
    await this.ensurePost(postId);
    await this.ensureUser(userId);

    return this.dataSource.transaction(async (manager) => {
      const reactions = manager.getRepository(PostReaction);
      const existing = await reactions.findOne({
        where: { postId, userId },
      });

      if (type === null) {
        if (existing) {
          await reactions.remove(existing);
        }
      } else if (existing) {
        existing.type = type;
        await reactions.save(existing);
      } else {
        await reactions.save(reactions.create({ postId, userId, type }));
      }

      const likeCount = await reactions.count({
        where: { postId, type: ReactionType.LIKE },
      });
      const dislikeCount = await reactions.count({
        where: { postId, type: ReactionType.DISLIKE },
      });

      await manager
        .getRepository(Post)
        .update({ id: postId }, { likeCount, dislikeCount });

      return {
        postId,
        userId,
        reaction: type,
        likeCount,
        dislikeCount,
      };
    });
  }

  private async ensurePost(postId: string): Promise<void> {
    const exists = await this.postsRepository.existsBy({ id: postId });
    if (!exists) {
      throw new NotFoundException(`Post ${postId} not found`);
    }
  }

  private async ensureUser(userId: string): Promise<void> {
    const exists = await this.usersRepository.existsBy({ id: userId });
    if (!exists) {
      throw new NotFoundException(`User ${userId} not found`);
    }
  }
}
