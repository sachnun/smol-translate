import { serve } from "bun"
import { translate, languages } from "google-translate-api-x"
import z from "zod"

const schema = z.object({
    target: z.string().refine(
        t => Object.keys(languages).includes(t),
        { message: "Invalid target language" }
    ),
    text: z.string().min(1, { message: "Text is required" })
})

async function translator(original: string, target: string) {
    const { from, text } = await translate(original, { to: target })
    return { from: from.language.iso, result: text }
}

function language(iso: string) {
    return languages[iso as keyof typeof languages].toLowerCase()
}

const server = serve({
    port: 3000,
    routes: {
        "/": {
            GET: () => {
                return Response.json({
                    message: "Unleash the power of Translator API",
                    language: Object.keys(languages).slice(1)
                })
            }
        },
        "/:target": {
            GET: async (req) => {
                const url = new URL(req.url);
                const parse = schema.safeParse({
                    target: req.params.target,
                    text: url.searchParams.get("text") || url.searchParams.get("t") || ""
                })
                if (!parse.success) throw new TypeError(parse.error.errors[0].message)

                const { from, result } = await translator(parse.data.text, parse.data.target)
                return Response.json({
                    lang: {
                        from: language(from), to: language(parse.data.target)
                    },
                    result
                });
            }
        },
    },
    error(err) {
        if (err instanceof TypeError) {
            return Response.json({ error: err.message.toLowerCase() }, { status: 400 })
        }
        return Response.json({ error: "Unknown error" }, { status: 500 })
    }
})

console.log(`Server running at ${server.url}`)