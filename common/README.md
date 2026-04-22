<p align="center">
  <img src="../assets/banners/common-banner.svg" height="120" alt="HouseMix Logo - Backend" />
</p>

This subproject contains all the model classes that are shared between the frontend and backend, in order to avoid duplicated code. This project is not much more
than a collection of models, the corresponding JSON serialized classes with the serialization/deserialization logic and some helper classes for REST communication.

As a general rule, the classes in this project should contain as much logic and helper functions as possible, excluding server-side-only business logic and glue logic.

### Caveat

This subproject only has one peculiarity: the JSON classes' properties are decorated with `class-validator` and `class-transformer` decorators for automatic validation on the backend's side.
Since the two libraries are not available on browsers and this would cause a compilation error, the decorators are proxied through [the decorators.ts file](src/decorators/decorators.ts)
which has alias rest-decorators and re-exports the decorators from the two libraries. The frontend's [`tsconfig.json`](/frontend/tsconfig.json) file then subsitutes that alias with
[the decorators-mock.ts file](src/decorators/decorators-mock.ts), which exports a dummy version of all the necessary decorators, so that compilation in the frontend doesn't fail.
For this to work on the frontend, the common is imported as plain js in the frontend, and needs to be recompiled at every change

This is an inelegant and suboptimal design decision taken because it is the lesser evil to avoid manual validation on one hand and duplication of the JSON classes on the other.
