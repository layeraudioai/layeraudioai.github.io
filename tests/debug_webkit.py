from playwright.sync_api import sync_playwright
import time

URL = 'http://localhost:8000/index.html'

with sync_playwright() as p:
    browser = p.webkit.launch(headless=True)
    ctx = browser.new_context()
    page = ctx.new_page()

    page.on('console', lambda msg: print('CONSOLE[webkit]', msg.text))

    print('Navigating to', URL)
    page.goto(URL, timeout=60000)
    page.wait_for_selector('#vendorStatus', state='attached', timeout=30000)
    print('vendorStatus:', page.inner_text('#vendorStatus'))

    print('Uploading test_local.wav')
    page.set_input_files('#songInput', 'test_local.wav')

    print('Clicking start')
    page.click('#startBtn')
    page.wait_for_function('window.layai && window.layai.audioBuffers && window.layai.audioBuffers.length > 0', timeout=60000)
    print('Audio buffers decoded')

    print('Clicking generate')
    page.click('#generateBtn')

    print('Waiting for mixReady (up to 180s)')
    try:
        page.wait_for_function('window.layai && window.layai.mixReady === true', timeout=180000)
        print('Mix ready')
    except Exception as e:
        print('Timeout waiting for mixReady:', e)
        try:
            snapshot = page.evaluate("() => ({mixReady: window.layai && window.layai.mixReady, mixError: window.layai && window.layai.mixError, logs: window.layai && window.layai._logs})")
            print('layai snapshot:', snapshot)
        except Exception as ex:
            print('Failed to capture snapshot:', ex)

    browser.close()
