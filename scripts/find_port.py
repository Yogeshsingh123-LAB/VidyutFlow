import socket
import sys

def is_free(p):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.5)
    try:
        res = s.connect_ex(('127.0.0.1', p))
        return res != 0
    except Exception:
        return True
    finally:
        s.close()

def main():
    candidate_ports = [8000, 8008, 8080, 8088]
    for p in candidate_ports:
        if is_free(p):
            print(p)
            sys.exit(0)
    print(8000)

if __name__ == '__main__':
    main()
