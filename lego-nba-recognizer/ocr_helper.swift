// Reads image paths from stdin (one per line); prints one JSON array of recognized text per image.
import Vision
import AppKit

setvbuf(stdout, nil, _IOLBF, 0)
while let path = readLine() {
    var out: [[String: Any]] = []
    if let img = NSImage(contentsOfFile: path),
       let cg = img.cgImage(forProposedRect: nil, context: nil, hints: nil) {
        let req = VNRecognizeTextRequest()
        req.recognitionLevel = .accurate
        req.usesLanguageCorrection = false
        try? VNImageRequestHandler(cgImage: cg).perform([req])
        for obs in req.results ?? [] {
            guard let top = obs.topCandidates(1).first else { continue }
            out.append(["text": top.string, "conf": top.confidence])
        }
    }
    let data = try! JSONSerialization.data(withJSONObject: out)
    print(String(data: data, encoding: .utf8)!)
}
