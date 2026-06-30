import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../providers/auth_provider.dart';
import '../services/supabase_service.dart';

enum _ScanState { scanning, submitting, success, error }

class ScanScreen extends ConsumerStatefulWidget {
  const ScanScreen({super.key});

  @override
  ConsumerState<ScanScreen> createState() => _ScanScreenState();
}

class _ScanScreenState extends ConsumerState<ScanScreen> {
  final MobileScannerController _controller = MobileScannerController(
    detectionSpeed: DetectionSpeed.normal,
    facing: CameraFacing.back,
  );

  _ScanState _state = _ScanState.scanning;
  String _roomName = '';
  String _errorMsg = '';
  bool _processed = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _handleBarcode(BarcodeCapture capture) async {
    if (_processed) return;
    final barcode = capture.barcodes.firstOrNull;
    if (barcode?.rawValue == null) return;

    final rawValue = barcode!.rawValue!;
    _processed = true;
    await _controller.stop();

    setState(() => _state = _ScanState.submitting);

    try {
      // QR value format: full URL https://.../room/UUID or plain UUID
      final uuidRegex = RegExp(
          r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
          caseSensitive: false);

      // Try to extract UUID from URL path /room/UUID first
      final urlMatch = RegExp(r'/room/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', caseSensitive: false)
          .firstMatch(rawValue.trim());
      final roomId = urlMatch != null
          ? urlMatch.group(1)!
          : (uuidRegex.hasMatch(rawValue.trim()) ? rawValue.trim() : null);

      if (roomId == null) {
        setState(() {
          _state = _ScanState.error;
          _errorMsg = '╨Э╨╡╨▓╨╡╤А╨╜╤Л╨╣ QR-╨║╨╛╨┤. ╨Ш╤Б╨┐╨╛╨╗╤М╨╖╤Г╨╣╤В╨╡ QR ╨╛╤В LabGate.';
        });
        return;
      }

      // Get current user profile
      final user = SupabaseService.currentUser;
      if (user == null) {
        if (mounted) context.go('/login');
        return;
      }

      final profile = await SupabaseService.getProfile(user.id);
      if (profile == null || !profile.isStudent) {
        if (mounted) context.go('/login');
        return;
      }

      // Get room info
      final rooms = await SupabaseService.getRooms();
      final room = rooms.where((r) => r.id == roomId).firstOrNull;
      if (room == null) {
        setState(() {
          _state = _ScanState.error;
          _errorMsg = '╨Ъ╨╛╨╝╨╜╨░╤В╨░ ╨╜╨╡ ╨╜╨░╨╣╨┤╨╡╨╜╨░ ╨╕╨╗╨╕ ╨╜╨╡╨░╨║╤В╨╕╨▓╨╜╨░.';
        });
        return;
      }

      // Record visit (skip if already registered)
      await SupabaseService.recordVisitIfNotExists(
        roomId: roomId,
        userId: user.id,
        username: profile.username,
      );

      setState(() {
        _state = _ScanState.success;
        _roomName = room.name;
      });

      // Auto-return after 3 seconds
      await Future.delayed(const Duration(seconds: 3));
      if (mounted) context.pop();
    } catch (e) {
      setState(() {
        _state = _ScanState.error;
        _errorMsg = '╨Ю╤И╨╕╨▒╨║╨░: ${e.toString()}';
      });
    }
  }

  void _retry() {
    setState(() {
      _state = _ScanState.scanning;
      _errorMsg = '';
      _processed = false;
    });
    _controller.start();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Camera
          if (_state == _ScanState.scanning)
            MobileScanner(
              controller: _controller,
              onDetect: _handleBarcode,
            ),

          // Dark overlay when not scanning
          if (_state != _ScanState.scanning)
            Container(color: const Color(0xFF0A0A0F)),

          // UI overlay
          SafeArea(
            child: Column(
              children: [
                // Top bar
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      IconButton(
                        onPressed: () => context.pop(),
                        icon: const Icon(Icons.close,
                            color: Colors.white, size: 24),
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.white.withOpacity(0.1),
                          shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(width: 12),
                      const Text(
                        '╨б╨║╨░╨╜╨╡╤А QR-╨║╨╛╨┤╨░',
                        style: TextStyle(
                            color: Colors.white,
                            fontSize: 18,
                            fontWeight: FontWeight.w600),
                      ),
                      const Spacer(),
                      if (_state == _ScanState.scanning)
                        IconButton(
                          onPressed: () => _controller.toggleTorch(),
                          icon: const Icon(Icons.flashlight_on,
                              color: Colors.white70, size: 22),
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.white.withOpacity(0.1),
                            shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                    ],
                  ),
                ),

                const Spacer(),

                // Center content
                if (_state == _ScanState.scanning) ...[
                  // Scan frame
                  Container(
                    width: 240,
                    height: 240,
                    decoration: BoxDecoration(
                      border: Border.all(
                          color: const Color(0xFF6C63FF), width: 2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Stack(
                      children: [
                        // Corner decorations
                        ..._buildCorners(),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  Text(
                    '╨Э╨░╨▓╨╡╨┤╨╕╤В╨╡ ╨║╨░╨╝╨╡╤А╤Г ╨╜╨░ QR-╨║╨╛╨┤\n╤Г ╨▓╤Е╨╛╨┤╨░ ╨▓ ╨╗╨░╨▒╨╛╤А╨░╤В╨╛╤А╨╕╤О',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                        color: Colors.white.withOpacity(0.6), fontSize: 15),
                  ),
                ] else if (_state == _ScanState.submitting) ...[
                  const CircularProgressIndicator(color: Color(0xFF6C63FF)),
                  const SizedBox(height: 20),
                  const Text('╨Ч╨░╨┐╨╕╤Б╤Л╨▓╨░╨╡╨╝ ╨┐╨╛╤Б╨╡╤Й╨╡╨╜╨╕╨╡...',
                      style: TextStyle(color: Colors.white70, fontSize: 16)),
                ] else if (_state == _ScanState.success) ...[
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.green.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: Colors.green.withOpacity(0.4), width: 2),
                    ),
                    child: const Icon(Icons.check_circle_outline,
                        color: Colors.greenAccent, size: 44),
                  ),
                  const SizedBox(height: 20),
                  const Text('╨Ф╨╛╤Б╤В╤Г╨┐ ╤А╨░╨╖╤А╨╡╤И╤С╨╜!',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Text('╨Т╤Е╨╛╨┤ ╨▓ ┬л$_roomName┬╗ ╨╖╨░╨┐╨╕╤Б╨░╨╜',
                      style: TextStyle(
                          color: Colors.white.withOpacity(0.5), fontSize: 15)),
                ] else if (_state == _ScanState.error) ...[
                  Container(
                    width: 80,
                    height: 80,
                    decoration: BoxDecoration(
                      color: Colors.red.withOpacity(0.15),
                      shape: BoxShape.circle,
                      border: Border.all(
                          color: Colors.red.withOpacity(0.4), width: 2),
                    ),
                    child: const Icon(Icons.error_outline,
                        color: Colors.redAccent, size: 44),
                  ),
                  const SizedBox(height: 20),
                  const Text('╨Ю╤И╨╕╨▒╨║╨░',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold)),
                  const SizedBox(height: 8),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 40),
                    child: Text(_errorMsg,
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: Colors.white.withOpacity(0.5),
                            fontSize: 14)),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _retry,
                    icon: const Icon(Icons.refresh),
                    label: const Text('╨Я╨╛╨┐╤А╨╛╨▒╨╛╨▓╨░╤В╤М ╤Б╨╜╨╛╨▓╨░'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF6C63FF),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
                ],

                const Spacer(),
                const SizedBox(height: 40),
              ],
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildCorners() {
    const color = Color(0xFF6C63FF);
    const size = 24.0;
    const thickness = 3.0;
    return [
      // Top-left
      Positioned(
          top: 0,
          left: 0,
          child: _Corner(color: color, size: size, thickness: thickness,
              top: true, left: true)),
      // Top-right
      Positioned(
          top: 0,
          right: 0,
          child: _Corner(color: color, size: size, thickness: thickness,
              top: true, left: false)),
      // Bottom-left
      Positioned(
          bottom: 0,
          left: 0,
          child: _Corner(color: color, size: size, thickness: thickness,
              top: false, left: true)),
      // Bottom-right
      Positioned(
          bottom: 0,
          right: 0,
          child: _Corner(color: color, size: size, thickness: thickness,
              top: false, left: false)),
    ];
  }
}

class _Corner extends StatelessWidget {
  final Color color;
  final double size;
  final double thickness;
  final bool top;
  final bool left;

  const _Corner({
    required this.color,
    required this.size,
    required this.thickness,
    required this.top,
    required this.left,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CornerPainter(
            color: color, thickness: thickness, top: top, left: left),
      ),
    );
  }
}

class _CornerPainter extends CustomPainter {
  final Color color;
  final double thickness;
  final bool top;
  final bool left;

  _CornerPainter(
      {required this.color,
      required this.thickness,
      required this.top,
      required this.left});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..strokeWidth = thickness
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path();
    if (top && left) {
      path.moveTo(0, size.height);
      path.lineTo(0, 0);
      path.lineTo(size.width, 0);
    } else if (top && !left) {
      path.moveTo(0, 0);
      path.lineTo(size.width, 0);
      path.lineTo(size.width, size.height);
    } else if (!top && left) {
      path.moveTo(0, 0);
      path.lineTo(0, size.height);
      path.lineTo(size.width, size.height);
    } else {
      path.moveTo(0, size.height);
      path.lineTo(size.width, size.height);
      path.lineTo(size.width, 0);
    }
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(_CornerPainter old) => false;
}

