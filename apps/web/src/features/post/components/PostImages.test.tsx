import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { PostMedia } from '../types';
import { PostImages } from './PostImages';

/**
 * 영상만 있는 게시물(릴스 등)이 빈 화면이 되지 않는지 — 그리고 이미지가 그대로
 * `<img>` 로 남는지 확인한다. jsdom 은 재생을 흉내내지 않으므로 어떤 태그로
 * 그리는지까지만 본다.
 */
const IMAGE_URL = 'https://cdn.example.com/posts/1.jpg';
const VIDEO_URL = 'https://cdn.example.com/posts/1.mp4?token=abc';
const POSTER_URL = 'https://cdn.example.com/posts/1-poster.jpg';

const IMAGE: PostMedia = { url: IMAGE_URL, type: 'IMAGE' };
// 포스터를 일부러 붙여 둔다 — 여기는 재생하는 자리라 포스터가 있어도 원본을 써야 한다.
const VIDEO: PostMedia = { url: VIDEO_URL, thumbnailUrl: POSTER_URL, type: 'VIDEO' };

describe('PostImages', () => {
  it('영상 1개면 시안 컨트롤을 얹은 video 로 그린다', () => {
    const { container } = render(<PostImages media={[VIDEO]} onImageClick={vi.fn()} />);

    const video = container.querySelector('video');
    expect(video).toHaveAttribute('src', VIDEO_URL);
    // 네이티브 컨트롤 바가 아니라 시안의 재생/일시정지 버튼을 쓴다.
    expect(video).not.toHaveAttribute('controls');
    expect(screen.getByRole('button', { name: '일시정지' })).toBeInTheDocument();
    // 확대 보기 버튼으로 감싸면 재생 버튼 클릭이 뷰어를 같이 연다.
    expect(screen.queryByRole('button', { name: '이미지 크게 보기' })).not.toBeInTheDocument();
  });

  it('영상 확대는 onVideoExpand 를 넘겼을 때만 버튼이 생긴다', () => {
    const onVideoExpand = vi.fn();
    const { rerender } = render(<PostImages media={[VIDEO]} onImageClick={vi.fn()} />);
    expect(screen.queryByRole('button', { name: '영상 크게 보기' })).not.toBeInTheDocument();

    rerender(<PostImages media={[VIDEO]} onImageClick={vi.fn()} onVideoExpand={onVideoExpand} />);
    screen.getByRole('button', { name: '영상 크게 보기' }).click();
    expect(onVideoExpand).toHaveBeenCalled();
  });

  it('이미지 1개면 확대 보기 버튼 안의 img 로 그린다', () => {
    const { container } = render(<PostImages media={[IMAGE]} onImageClick={vi.fn()} />);

    expect(container.querySelector('video')).toBeNull();
    expect(screen.getByRole('button', { name: '이미지 크게 보기' })).toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', IMAGE_URL);
  });

  it('포스터가 있어도 상세에서는 원본 영상을 쓴다', () => {
    const { container } = render(<PostImages media={[VIDEO]} onImageClick={vi.fn()} />);

    expect(container.querySelector('video')).toHaveAttribute('src', VIDEO_URL);
    expect(container.querySelector('img')).toBeNull();
  });

  it('이미지와 영상이 섞이면 캐러셀에 둘 다 남는다', () => {
    const { container } = render(<PostImages media={[IMAGE, VIDEO]} onImageClick={vi.fn()} />);

    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelectorAll('video')).toHaveLength(1);
    // 캐러셀 슬라이드의 영상은 첫 프레임만 — 재생은 확대 뷰에서 한다.
    expect(container.querySelector('video')).not.toHaveAttribute('controls');
  });
});
