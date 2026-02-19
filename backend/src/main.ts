import {NestFactory} from "@nestjs/core";
import {AppModule} from "./app.module";
import {ConsoleLogger, ValidationPipe} from "@nestjs/common";
import {DocumentBuilder, SwaggerModule} from "@nestjs/swagger";

async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, {
        logger: new ConsoleLogger()
    });
    
    app.useGlobalPipes(new ValidationPipe(
        {
            transform: true,
            whitelist: true,
        }
    ));
    
    
    const isProd = process.env["NODE_ENV"] === "production";
    
    if (isProd) {
        app.setGlobalPrefix("house-mix/api");
        console.log("Running in production");
    } else {
        app.enableCors({
                           origin: "http://localhost:4201"
                       });
        console.log("Running in development");
    }
    
    const config = new DocumentBuilder()
      .setTitle('My API')
      .setVersion('1.0')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);
    
    await app.listen(process.env["PORT"] ?? 3000);
}

void bootstrap();
