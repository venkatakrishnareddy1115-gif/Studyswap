import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const workspaceDir = "C:/Users/Krishna Reddy/OneDrive/Desktop/STUDY CONNECT";
const skillDir = "C:/Users/Krishna Reddy/.codex/plugins/cache/openai-primary-runtime/presentations/26.1025.11240/skills/presentations";
const runtimeNodeModules = "C:/Users/Krishna Reddy/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const draftPath = path.join(workspaceDir, ".codex-ppt-build", "StudyConnect_Problem_Framing_draft.pptx");
const finalPath = path.join(workspaceDir, "output", "StudyConnect_Problem_Framing.pptx");
const previewPath = path.join(workspaceDir, ".codex-ppt-build", "slide-preview.png");

process.env.RUNTIME_NODE_MODULES = runtimeNodeModules;
const helpersUrl = pathToFileURL(path.join(skillDir, "container_tools/runtime_helpers.mjs"));
const { importRuntimeModule } = await import(helpersUrl.href);
const { Presentation, PresentationFile } = await importRuntimeModule("@oai/artifact-tool");

const presentation = Presentation.create({ slideSize: { width: 1280, height: 720 } });
const slide = presentation.slides.add();
slide.background.fill = "#f5f4fd";

const png = await fs.readFile(path.join(workspaceDir, ".codex-ppt-build", "studyconnect-infographic.png"));
const imageBytes = png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength);
slide.images.add({
  blob: imageBytes,
  contentType: "image/png",
  alt: "StudyConnect problem framing infographic with a student problem cycle and six framing categories",
  fit: "contain",
  position: { left: 64, top: 0, width: 1152, height: 720 },
});
slide.speakerNotes.text = "StudyConnect problem framing. The graphic presents the student problem cycle and the context, problem, alternatives, customers, emotional impact, and shortcomings. The slide is built from the project infographic supplied for this request.";

const preview = await presentation.export({ slide, format: "png", scale: 1 });
await fs.writeFile(previewPath, new Uint8Array(await preview.arrayBuffer()));
const pptx = await PresentationFile.exportPptx(presentation);
await pptx.save(draftPath);

const { finalizePresentation } = await import(pathToFileURL(path.join(skillDir, "container_tools/artifact_tool_utils.mjs")).href);
const stagingDir = path.join(workspaceDir, ".codex-ppt-build", "finalizer");
await fs.mkdir(stagingDir, { recursive: true });
await fs.mkdir(path.dirname(finalPath), { recursive: true });
const result = await finalizePresentation({
  workspaceDir,
  candidatePath: draftPath,
  finalPath,
  pythonExecutable: "C:/Users/Krishna Reddy/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe",
  integrityValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_package_integrity.py"),
  layoutValidatorPath: path.join(skillDir, "container_tools/inspect_presentation_layout_geometry.py"),
  layoutArgs: ["--expected-slide-size-emu", "12192000,6858000", "--validate-bullet-geometry", "--validate-heading-fit"],
  requiredNativeTableOwnerSlides: [],
  fontPolicy: { basis: "design", families: ["Segoe UI"] },
  verifyArtifactToolImport: true,
  receiptPath: path.join(stagingDir, "StudyConnect_Problem_Framing.validation.json"),
});
console.log(JSON.stringify({ finalPath, previewPath, result }, null, 2));
