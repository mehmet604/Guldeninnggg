import { createApp } from './app.mjs';

const app = await createApp(process.env);
app.listen(Number(process.env.PORT || 8080), '0.0.0.0');
