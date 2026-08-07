import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../auth/auth.types';
import { ForumService } from './forum.service';
import { CreateForumAnswerDto, CreateForumPostDto, ForumFeedQuery } from './dto/forum.dto';
import { forumImageMulterOptions } from './upload.config';
import { ok } from '../common/api-envelope';

@Controller('api/v1/forum')
@UseGuards(JwtAuthGuard)
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('posts')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('image', forumImageMulterOptions))
  async createPost(
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: CreateForumPostDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.forumService.createPost(req.user, image, dto));
  }

  @Get('posts')
  async listPosts(@Query() query: ForumFeedQuery, @Req() req: AuthenticatedRequest) {
    const result = await this.forumService.listPosts(req.user, query);
    return ok(result.items, {
      page: result.page,
      limit: result.limit,
      hasMore: result.hasMore,
      sort: result.sort,
    });
  }

  @Get('posts/:id')
  async getPost(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.forumService.getPostDetail(req.user, id));
  }

  @Post('answers')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('image', forumImageMulterOptions))
  async createAnswer(
    @UploadedFile() image: Express.Multer.File | undefined,
    @Body() dto: CreateForumAnswerDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return ok(await this.forumService.createAnswer(req.user, image, dto));
  }

  @Post('answers/:id/upvote')
  @HttpCode(200)
  async upvote(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.forumService.toggleUpvote(req.user, id));
  }

  @Post('answers/:id/accept')
  @HttpCode(200)
  async accept(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return ok(await this.forumService.acceptAnswer(req.user, id));
  }
}
