from playwright.sync_api import sync_playwright
import base64

URL = 'http://localhost:8000/index.html'

TEST_BROWSERS = [
    ('chromium', 'chromium'),
    ('firefox', 'firefox'),
    ('webkit', 'webkit'),
]

# Create a small test WAV file locally so browsers that lack OfflineAudioContext can
# still receive the same test input via file upload.
def make_test_wav(path='test_local.wav', duration=0.5, sample_rate=44100):
    import wave, math, struct
    n_samples = int(sample_rate * duration)
    amplitude = 1600
    freq = 440.0
    with wave.open(path, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for i in range(n_samples):
            sample = int(amplitude * math.sin(2 * math.pi * freq * i / sample_rate))
            wf.writeframes(struct.pack('<h', sample))


def run_for(browser_name, browser_launcher):
    print('Running smoke test on', browser_name)
    with browser_launcher.launch(headless=True) as browser:
        ctx = browser.new_context()
        page = ctx.new_page()
        # forward browser console to test output for debugging
        page.on('console', lambda msg: print(f'CONSOLE[{browser_name}]', msg.text))
        print('Navigating to', URL)
        page.goto(URL, timeout=60000)

        page.wait_for_selector('#vendorStatus', state='attached', timeout=30000)
        vendor_text = page.inner_text('#vendorStatus')
        print('vendorStatus:', vendor_text)

        print('Uploading local test WAV to file input...')
        page.set_input_files('#songInput', 'test_local.wav')

        print('Clicking start...')
        page.click('#startBtn')
        page.wait_for_function('window.layai && window.layai.audioBuffers && window.layai.audioBuffers.length > 0', timeout=60000)
        print('Audio buffers decoded')

        print('Generating mix...')
        page.click('#generateBtn')
        page.wait_for_function('window.layai && window.layai.mixReady === true', timeout=180000)
        print('Mix generation complete')

        ext = page.evaluate("() => (window.layai.mixFilename || 'out.wav').split('.').pop()")
        b64 = page.evaluate("async () => { return await new Promise(resolve => { const reader = new FileReader(); reader.onload = ()=> resolve(reader.result.split(',')[1]); reader.readAsDataURL(window.layai.mixBlob); }); }")

        data = base64.b64decode(b64)
        out_name = f'test_output-{browser_name}.{ext}'
        with open(out_name, 'wb') as of:
            of.write(data)

        print('Saved', out_name, 'size', len(data))

def main():
    # ensure test WAV exists
    make_test_wav('test_local.wav')
    with sync_playwright() as p:
        for name, key in TEST_BROWSERS:
            launcher = getattr(p, key)
            try:
                run_for(name, launcher)
            except Exception as e:
                print('ERROR on', name, e)

if __name__ == '__main__':
    main()
