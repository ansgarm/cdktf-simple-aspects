import { Construct, IConstruct } from "constructs";
import { App, TerraformResource, TerraformStack } from "cdktf";
import { RandomProvider } from "@cdktf/provider-random/lib/provider";
import { Pet } from "@cdktf/provider-random/lib/pet";
import { Password } from "@cdktf/provider-random/lib/password";
import { Aspects } from "cdktf";

class MyStack extends TerraformStack {
  constructor(scope: Construct, id: string) {
    super(scope, id);

    // define resources here
    new RandomProvider(this, "random");

    new Password(this, "password", { length: 10 });
    new Pet(this, "pet");
    const zoo = new Zoo(this, "zoo");

    Every(Pet).in(this).length(10);
    Every(Pet).in(zoo).prefix("zoo").separator("+");

    Every(Password).in(this).minSpecial(5).numeric(true).special(true);
  }
}

class Zoo extends Construct {
  constructor(scope: IConstruct, id: string) {
    super(scope, id);

    new Pet(this, "pet1");
    new Pet(this, "pet2");
    new Pet(this, "pet3");
    new Pet(this, "pet4");
  }
}

const app = new App();
new MyStack(app, "cdktf-simple-aspects");
app.synth();

type Constructor<T> = new (...args: any[]) => T;

function Every<R extends TerraformResource>(c: Constructor<R>) {
  return {
    in(scope: IConstruct): CaptureProxy<R> {
      const props: Record<string | symbol, any> = {};

      Aspects.of(scope).add({
        visit(node) {
          if (
            node instanceof TerraformResource &&
            node.terraformResourceType === new c().terraformResourceType
          ) {
            Object.entries(props).forEach(([key, val]) => {
              (node as any)[key] = val;
            });
          }
        },
      });

      const proxy: any = new Proxy(
        {},
        {
          get(target, p, receiver) {
            return (val: any) => {
              props[p] = val;
              return proxy;
            };
          },
        }
      );

      return proxy as CaptureProxy<R>;
    },
  };
}

type CaptureProxy<R extends TerraformResource> = {
  [Property in WritableKeysOf<R>]: (value: R[Property]) => CaptureProxy<R>;
};

// https://stackoverflow.com/a/52473108
// https://github.com/Microsoft/TypeScript/issues/27024#issuecomment-421529650
type IfEquals<X, Y, A, B> = (<T>() => T extends X ? 1 : 2) extends <
  T
>() => T extends Y ? 1 : 2
  ? A
  : B;

type WritableKeysOf<T> = {
  [P in keyof T]: IfEquals<
    { [Q in P]: T[P] },
    { -readonly [Q in P]: T[P] },
    P,
    never
  >;
}[keyof T];
