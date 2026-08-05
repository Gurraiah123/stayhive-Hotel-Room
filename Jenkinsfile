pipeline {

    agent any

    options {
        timestamps()
        ansiColor('xterm')
    }

    environment {

        FRONTEND = "frontend"
        BACKEND = "backend"

        FRONTEND_IMAGE = "guru0114/stayhive-frontend"
        BACKEND_IMAGE = "guru0114/stayhive-backend"

        IMAGE_TAG = "${BUILD_NUMBER}"

        // Nexus running in Docker and exposed on port 8081
        NEXUS_URL = "16.112.182.98:8081"
        NEXUS_REPO = "stayhive-raw"
    }

    stages {

        stage('Checkout Source') {
            steps {
                checkout scm
            }
        }

        stage('Display Project Structure') {
            steps {
                sh '''
                echo "========== Project Structure =========="
                pwd
                ls -la

                echo "========== Frontend =========="
                ls -la frontend

                echo "========== Backend =========="
                ls -la backend
                '''
            }
        }

        stage('Backend Dependencies') {
            steps {
                dir("${BACKEND}") {
                    sh 'npm install'
                }
            }
        }

        stage('SonarQube Scan') {
            steps {
                withCredentials([
                    string(
                        credentialsId: 'sonar-token',
                        variable: 'SONAR_TOKEN'
                    )
                ]) {
                    sh '''
                    docker run --rm \
                      -e SONAR_HOST_URL=http://16.112.182.98:9000 \
                      -e SONAR_TOKEN=$SONAR_TOKEN \
                      -v "$WORKSPACE:/usr/src" \
                      -w /usr/src \
                      sonarsource/sonar-scanner-cli \
                      -Dsonar.projectKey=stayhive \
                      -Dsonar.projectName=StayHive \
                      -Dsonar.sources=. \
                      -Dsonar.exclusions=**/node_modules/**,**/.git/** \
                      -Dsonar.sourceEncoding=UTF-8
                    '''
                }
            }
        }

        stage('Docker Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub',
                        usernameVariable: 'DOCKER_USER',
                        passwordVariable: 'DOCKER_PASS'
                    )
                ]) {
                    sh '''
                    echo "$DOCKER_PASS" | docker login \
                    -u "$DOCKER_USER" \
                    --password-stdin
                    '''
                }
            }
        }

        stage('Build Docker Images') {
            steps {
                sh """
                echo "========== Building Frontend =========="
                docker build \
                -t ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                ./frontend

                echo "========== Building Backend =========="
                docker build \
                -t ${BACKEND_IMAGE}:${IMAGE_TAG} \
                ./backend

                echo "========== Creating Latest Tags =========="
                docker tag \
                ${FRONTEND_IMAGE}:${IMAGE_TAG} \
                ${FRONTEND_IMAGE}:latest

                docker tag \
                ${BACKEND_IMAGE}:${IMAGE_TAG} \
                ${BACKEND_IMAGE}:latest
                """
            }
        }

        stage('Push Docker Images') {
            steps {
                sh """
                echo "========== Push Frontend =========="
                docker push ${FRONTEND_IMAGE}:${IMAGE_TAG}
                docker push ${FRONTEND_IMAGE}:latest

                echo "========== Push Backend =========="
                docker push ${BACKEND_IMAGE}:${IMAGE_TAG}
                docker push ${BACKEND_IMAGE}:latest
                """
            }
        }

        stage('Create ZIP') {
            steps {
                sh '''
                echo "========== Creating Nexus Artifact =========="

                rm -f stayhive.zip

                zip -r stayhive.zip . \
                    -x "*.git*" \
                    -x "backend/node_modules/*" \
                    -x "stayhive.zip"

                echo "========== Artifact Created =========="
                ls -lh stayhive.zip
                '''
            }
        }

        stage('Upload to Nexus') {
            steps {
                nexusArtifactUploader(
                    nexusVersion: 'nexus3',

                    protocol: 'http',

                    nexusUrl: "${NEXUS_URL}",

                    repository: "${NEXUS_REPO}",

                    groupId: 'com.stayhive',

                    version: "1.0.${BUILD_NUMBER}",

                    credentialsId: 'nexus-creds',

                    artifacts: [
                        [
                            artifactId: 'stayhive',
                            classifier: '',
                            file: 'stayhive.zip',
                            type: 'zip'
                        ]
                    ]
                )
            }
        }

        stage('Deploy Containers') {
            steps {
                sh '''
                echo "========== Stopping Old Containers =========="
                docker compose down || true

                echo "========== Pulling Images =========="
                docker compose pull

                echo "========== Starting Containers =========="
                docker compose up -d

                echo "========== Cleaning Old Images =========="
                docker image prune -af
                '''
            }
        }

        stage('Health Check') {
            steps {
                sh '''
                echo "========== Running Containers =========="
                docker ps

                echo ""
                echo "========== Docker Compose Status =========="
                docker compose ps
                '''
            }
        }
    }

    post {

        success {
            echo "========================================"
            echo "StayHive Deployment Successful"
            echo "========================================"
            echo "Docker images pushed successfully"
            echo "Artifact uploaded to Nexus successfully"
        }

        failure {
            echo "========================================"
            echo "StayHive Deployment Failed"
            echo "========================================"
        }

        always {
            cleanWs()
        }
    }
}
