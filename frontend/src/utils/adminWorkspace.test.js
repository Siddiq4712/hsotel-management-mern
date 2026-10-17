import { describe, it, expect } from 'vitest';
import { resolveWorkspace } from './adminWorkspace';
describe('workspace selection',()=>{
  it('allows Admin to select and restore staff workspaces',()=>{
    expect(resolveWorkspace('admin','warden')).toBe('warden');
    expect(resolveWorkspace('admin',null,'mess')).toBe('mess');
    expect(resolveWorkspace('admin','invalid','invalid')).toBe('admin');
  });
  it('never changes the workspace of regular staff or students',()=>{
    expect(resolveWorkspace('warden','admin','mess')).toBe('warden');
    expect(resolveWorkspace('student','warden')).toBe('student');
  });
});
