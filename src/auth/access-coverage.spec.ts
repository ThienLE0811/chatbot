import { Type } from '@nestjs/common';
import { PATH_METADATA } from '@nestjs/common/constants';
import { AppModule } from '../app.module';
import { ACCESS_KEY } from './access.decorators';

/** Every controller reachable from AppModule, through its module imports. */
function controllersOf(root: unknown): Type[] {
  const seen = new Set<unknown>();
  const found = new Set<Type>();
  const visit = (mod: any) => {
    const type = mod?.module ?? mod;
    if (typeof type !== 'function' || seen.has(type)) return;
    seen.add(type);
    const controllers = [
      ...(Reflect.getMetadata('controllers', type) ?? []),
      ...(mod.controllers ?? []),
    ];
    controllers.forEach((c: Type) => found.add(c));
    [
      ...(Reflect.getMetadata('imports', type) ?? []),
      ...(mod.imports ?? []),
    ].forEach(visit);
  };
  visit(root);
  return [...found];
}

describe('access coverage', () => {
  it('makes every route declare who may call it', () => {
    const undeclared: string[] = [];
    for (const controller of controllersOf(AppModule)) {
      const proto = controller.prototype;
      for (const name of Object.getOwnPropertyNames(proto)) {
        const handler = proto[name];
        if (typeof handler !== 'function' || name === 'constructor') continue;
        if (Reflect.getMetadata(PATH_METADATA, handler) === undefined) continue;
        const declared =
          Reflect.getMetadata(ACCESS_KEY, handler) ??
          Reflect.getMetadata(ACCESS_KEY, controller);
        if (!declared) undeclared.push(`${controller.name}.${name}`);
      }
    }
    // Thêm @Public(), @Authenticated() hoặc @RequirePermissions(...) cho các route này.
    expect(undeclared).toEqual([]);
  });
});
